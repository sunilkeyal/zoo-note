import { Db, ObjectId } from "mongodb"
import { saveImage, imageUrl } from "@/lib/gridfs"
import { convertOneNote } from "./convert"
import { compressImage } from "@/lib/image-compress"
import path from "path"
import fs from "fs/promises"
import os from "os"

interface OneNoteImportResult {
  foldersCreated: number
  notesImported: number
  imagesImported: number
  errors: string[]
}

const ONENOTE_MAGIC = Buffer.from([
  0xE4, 0x52, 0x5C, 0x7B, 0x8C, 0xD8, 0xA7, 0x4D,
  0xAE, 0xB1, 0x53, 0x78, 0xD0, 0x29, 0x96, 0xD3,
])

function hasOneNoteMagic(buffer: Buffer): boolean {
  return buffer.length >= ONENOTE_MAGIC.length && buffer.subarray(0, ONENOTE_MAGIC.length).equals(ONENOTE_MAGIC)
}

function isOnepkg(buffer: Buffer): boolean {
  return buffer.length >= "MSCF".length && buffer.toString("ascii", 0, "MSCF".length) === "MSCF"
}

export function detectOneNoteFormat(buffer: Buffer): "one" | "onepkg" | null {
  if (hasOneNoteMagic(buffer)) return "one"
  if (isOnepkg(buffer)) return "onepkg"
  return null
}

export async function importOneNote(
  buffer: Buffer,
  originalFilename: string,
  userId: string,
  db: Db
): Promise<OneNoteImportResult> {
  const result: OneNoteImportResult = {
    foldersCreated: 0,
    notesImported: 0,
    imagesImported: 0,
    errors: [],
  }

  const format = detectOneNoteFormat(buffer)
  if (!format) {
    throw new Error("Unsupported file format. Accepted: .onepkg, .one")
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "onenote-"))
  const safeName = path.basename(originalFilename)
  const inputPath = path.join(tmpDir, safeName)
  await fs.writeFile(inputPath, buffer)

  const outputDir = path.join(tmpDir, "output")
  await fs.mkdir(outputDir, { recursive: true })

  try {
    await convertOneNote(inputPath, outputDir, tmpDir)

    const pageEntries: { filePath: string; folderName: string }[] = []
    const entries = await fs.readdir(outputDir, { withFileTypes: true })
    const subdirs = entries.filter((e) => e.isDirectory())

    if (subdirs.length > 0) {
      for (const subdir of subdirs) {
        const sectionDir = path.join(outputDir, subdir.name)
        const files = (await fs.readdir(sectionDir)).filter((f) =>
          f.endsWith(".html")
        )
        for (const f of files) {
          pageEntries.push({
            filePath: path.join(sectionDir, f),
            folderName: subdir.name,
          })
        }
      }
    } else {
      const htmlFiles = entries
        .filter((e) => e.isFile() && e.name.endsWith(".html"))
        .map((e) => e.name)
      for (const f of htmlFiles) {
        pageEntries.push({
          filePath: path.join(outputDir, f),
          folderName: deriveFolderName(f),
        })
      }
    }

    if (pageEntries.length === 0) {
      result.errors.push("No pages found in the OneNote file")
      return result
    }

    const sectionPageOrder = new Map<string, Map<string, number>>()
    if (subdirs.length > 0) {
      for (const subdir of subdirs) {
        const tocPath = path.join(outputDir, `${subdir.name}.html`)
        try {
          const tocHtml = await fs.readFile(tocPath, "utf-8")
          const order = parsePageOrderFromToc(tocHtml)
          const posMap = new Map<string, number>()
          order.forEach((filename, index) => {
            posMap.set(filename, index)
          })
          sectionPageOrder.set(subdir.name, posMap)
        } catch {
          // No ToC file for this section — positions will default to 0
        }
      }
    }

    for (const { filePath: htmlPath, folderName } of pageEntries) {
      const fileName = path.basename(htmlPath)
      try {
        let html = await fs.readFile(htmlPath, "utf-8")
        const title = extractPageTitle(html) || fileName.replace(/\.html$/, "")
        html = extractBodyContent(html)
        html = stripFontStyles(html)

        const foldersCollection = db.collection("folders")
        let folderId: string | null = null
        const existing = await foldersCollection.findOne({
          name: folderName,
          userId,
          isDeleted: { $ne: true },
        })
        if (existing) {
          folderId = existing._id.toString()
        } else {
          const now = new Date()
          const insertResult = await foldersCollection.insertOne({
            name: folderName,
            position: 0,
            userId,
            createdAt: now,
            updatedAt: now,
          })
          folderId = insertResult.insertedId.toString()
          result.foldersCreated++
        }

        const sectionDir = path.dirname(htmlPath)
        const localResult = await processLocalImages(html, sectionDir, db, userId)
        html = localResult.cleanedHtml
        result.imagesImported += localResult.imageCount

        const { cleanedHtml, imageCount } = await processImages(html, db, userId)
        html = cleanedHtml
        result.imagesImported += imageCount

        const svgResult = await processSvgNodes(html, db, userId)
        html = svgResult.cleanedHtml
        result.imagesImported += svgResult.imageCount

        const notesCollection = db.collection("notes")
        const now = new Date()
        const position = sectionPageOrder.get(folderName)?.get(fileName) ?? 0
        await notesCollection.insertOne({
          title,
          content: html,
          folderId,
          position,
          userId,
          createdAt: now,
          updatedAt: now,
        })
        result.notesImported++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        result.errors.push(`Failed to import ${fileName}: ${message}`)
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    result.errors.push(`Conversion failed: ${message}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }

  return result
}

function deriveFolderName(filename: string): string {
  const dotIndex = filename.lastIndexOf(".")
  const withoutExt = dotIndex > 0 ? filename.slice(0, dotIndex) : filename
  const underscoreIndex = withoutExt.indexOf("_")
  if (underscoreIndex > 0) {
    return withoutExt.slice(0, underscoreIndex)
  }
  return withoutExt
}

const STRIP_STYLE_RE = /^\s*(?:font-family|font-size)\s*:/i

export function stripFontStyles(html: string): string {
  return html.replace(/style="[^"]*"/gi, (match) => {
    const inner = match.slice(7, -1)
    const escaped = inner.replace(/&quot;/g, "\x00Q\x00")
    const parts = escaped.split(";").filter(Boolean)
    const filtered = parts.filter((p) => !STRIP_STYLE_RE.test(p.trim()))
    if (filtered.length === 0) return ""
    const joined = filtered.map((p) => p.trim()).join("; ")
    return `style="${joined.replace(/\x00Q\x00/g, "&quot;")}"`
  })
}

export function parsePageOrderFromToc(tocHtml: string): string[] {
  const filenames: string[] = []
  const hrefRegex = /<a\s[^>]*href="([^"]*)"[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = hrefRegex.exec(tocHtml)) !== null) {
    const href = match[1]
    const decoded = decodeURIComponent(href)
    filenames.push(path.basename(decoded))
  }
  return filenames
}

export function extractBodyContent(html: string): string {
  let body = html
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  if (bodyMatch) {
    body = bodyMatch[1].trim()
  } else {
    body = body.replace(/<!DOCTYPE[^>]*>/i, "").replace(/<\/?html[^>]*>/gi, "").replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
  }
  body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
  body = stripTitleBlock(body)
  return body.trim()
}

function stripTitleBlock(html: string): string {
  const titleMatch = html.match(/<div\s[^>]*class="title"[^>]*>/i)
  if (!titleMatch) return html
  let depth = 1
  let i = titleMatch.index! + titleMatch[0].length
  while (i < html.length && depth > 0) {
    const nextOpen = html.slice(i).match(/^<div[^>]*>/i)
    const nextClose = html.slice(i).match(/^<\/div>/i)
    if (nextOpen && (!nextClose || nextOpen.index! < nextClose.index!)) {
      depth++
      i += nextOpen[0].length
    } else if (nextClose) {
      depth--
      i += 6
    } else {
      i++
    }
  }
  return (html.slice(0, titleMatch.index) + html.slice(i)).trim()
}

export function extractPageTitle(html: string): string {
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i)
  if (titleMatch) return titleMatch[1].trim()
  const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i)
  if (h1Match) return h1Match[1].trim()
  return ""
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"])

export function replaceLocalImageRefs(
  html: string,
  imageUrlMap: Map<string, string>
): { cleanedHtml: string; imageCount: number } {
  let imageCount = 0
  const imgRefRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi
  const replacements: { start: number; end: number; newTag: string }[] = []
  let match: RegExpExecArray | null

  while ((match = imgRefRegex.exec(html)) !== null) {
    const src = match[1]
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:") || src.startsWith("//")) {
      continue
    }
    const filename = path.basename(src)
    const gridfsUrl = imageUrlMap.get(filename)
    if (gridfsUrl) {
      imageCount++
      const fullMatch = match[0]
      const newTag = fullMatch.replace(`src="${src}"`, `src="${gridfsUrl}"`)
      replacements.push({ start: match.index, end: match.index + fullMatch.length, newTag })
    }
  }

  let cleanedHtml = html
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, newTag } = replacements[i]
    cleanedHtml = cleanedHtml.slice(0, start) + newTag + cleanedHtml.slice(end)
  }

  return { cleanedHtml, imageCount }
}

async function processLocalImages(
  html: string,
  sectionDir: string,
  db: Db,
  userId: string
): Promise<{ cleanedHtml: string; imageCount: number }> {
  let imageFiles: string[] = []
  try {
    const files = await fs.readdir(sectionDir)
    imageFiles = files.filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
  } catch {
    return { cleanedHtml: html, imageCount: 0 }
  }

  if (imageFiles.length === 0) {
    return { cleanedHtml: html, imageCount: 0 }
  }

  // Only upload images that are actually referenced in this page's HTML.
  // Uploading all files in the directory would create orphaned storage files
  // for every other page in the same section.
  const referencedInHtml = new Set<string>()
  const imgSrcRe = /<img[^>]+src="([^"]+)"[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = imgSrcRe.exec(html)) !== null) {
    const src = m[1]
    if (!src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('//')) {
      referencedInHtml.add(path.basename(src))
    }
  }
  imageFiles = imageFiles.filter((f) => referencedInHtml.has(f))

  if (imageFiles.length === 0) {
    return { cleanedHtml: html, imageCount: 0 }
  }

  const imageUrlMap = new Map<string, string>()
  for (const imageFile of imageFiles) {
    const imagePath = path.join(sectionDir, imageFile)
    try {
      const data = await fs.readFile(imagePath)
      const ext = path.extname(imageFile).toLowerCase().slice(1)
      const uploadId = new ObjectId()

      const compressed = await compressImage(data).catch(() => data)

      await saveImage(db, uploadId, imageFile,
        `image/${ext === "jpg" ? "jpeg" : ext}`,
        compressed,
        { userId, originalName: imageFile, uploadedAt: new Date() },
      )

      imageUrlMap.set(imageFile, imageUrl(uploadId.toHexString()))
    } catch {
      // skip individual image upload failures
    }
  }

  if (imageUrlMap.size === 0) {
    return { cleanedHtml: html, imageCount: 0 }
  }

  return replaceLocalImageRefs(html, imageUrlMap)
}

async function processImages(
  html: string,
  db: Db,
  userId: string
): Promise<{ cleanedHtml: string; imageCount: number }> {
  let imageCount = 0
  const replacements: { start: number; end: number; newSrc: string }[] = []

  const dataUriRegex = /<img[^>]+src="data:image\/([a-z]+);base64,([^"]+)"[^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = dataUriRegex.exec(html)) !== null) {
    const fullMatch = match[0]
    const ext = match[1]
    const base64Data = match[2]
    const uploadId = new ObjectId()
    const data = Buffer.from(base64Data, "base64")

    const compressed = await compressImage(data).catch(() => data)

    await saveImage(db, uploadId, `image-${uploadId.toHexString()}.${ext}`,
      `image/${ext === "svg" ? "svg+xml" : ext}`,
      compressed,
      { userId, originalName: `image-${uploadId.toHexString()}.${ext}`, uploadedAt: new Date() },
    )

    imageCount++
    replacements.push({
      start: match.index,
      end: match.index + fullMatch.length,
      newSrc: imageUrl(uploadId.toHexString()),
    })
  }

  let cleanedHtml = html
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, newSrc } = replacements[i]
    const originalTag = cleanedHtml.slice(start, end)
    const updatedTag = originalTag.replace(/src="[^"]+"/, `src="${newSrc}"`)
    cleanedHtml = cleanedHtml.slice(0, start) + updatedTag + cleanedHtml.slice(end)
  }

  return { cleanedHtml, imageCount }
}

async function processSvgNodes(
  html: string,
  db: Db,
  userId: string
): Promise<{ cleanedHtml: string; imageCount: number }> {
  const svgRegex = /<svg[^>]*>[\s\S]*?<\/svg>/gi
  const parts: string[] = []
  let lastIndex = 0
  let svgIndex = 0
  let imageCount = 0

  let match: RegExpExecArray | null
  while ((match = svgRegex.exec(html)) !== null) {
    parts.push(html.slice(lastIndex, match.index))
    const svgContent = match[0]
    svgIndex++
    const uploadId = new ObjectId()

    await saveImage(db, uploadId, `drawing-${svgIndex}.svg`,
      "image/svg+xml",
      Buffer.from(svgContent, "utf-8"),
      { userId, originalName: `drawing-${svgIndex}.svg`, uploadedAt: new Date() },
    )

    imageCount++
    parts.push(`<img src="${imageUrl(uploadId.toHexString())}" alt="Drawing" />`)
    lastIndex = match.index + match[0].length
  }

  parts.push(html.slice(lastIndex))
  return { cleanedHtml: parts.join(""), imageCount }
}
