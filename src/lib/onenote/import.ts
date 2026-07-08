import { Db, ObjectId } from "mongodb"
import { getBucket } from "@/lib/gridfs"
import { convertOneNote } from "./convert"
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
  return buffer.length >= 16 && buffer.subarray(0, 16).equals(ONENOTE_MAGIC)
}

function isOnepkg(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "MSCF"
}

export function detectOneNoteFormat(buffer: Buffer): "one" | "onepkg" | null {
  if (hasOneNoteMagic(buffer)) return "one"
  if (isOnepkg(buffer)) return "onepkg"
  return null
}

export async function importOneNote(
  buffer: Buffer,
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
  const ext = format === "onepkg" ? ".onepkg" : ".one"
  const inputPath = path.join(tmpDir, `import${ext}`)
  await fs.writeFile(inputPath, buffer)

  const outputDir = path.join(tmpDir, "output")
  await fs.mkdir(outputDir, { recursive: true })

  try {
    await convertOneNote(inputPath, outputDir, tmpDir)

    const htmlFiles = (await fs.readdir(outputDir)).filter((f) => f.endsWith(".html"))

    if (htmlFiles.length === 0) {
      result.errors.push("No pages found in the OneNote file")
      return result
    }

    const bucket = await getBucket()

    for (const htmlFile of htmlFiles) {
      const htmlPath = path.join(outputDir, htmlFile)
      let html = await fs.readFile(htmlPath, "utf-8")

      const folderName = deriveFolderName(htmlFile)

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

      const title = extractPageTitle(html) || htmlFile.replace(/\.html$/, "")

      const { cleanedHtml, imageCount } = await processImages(html, bucket, userId)
      html = cleanedHtml
      result.imagesImported += imageCount

      html = await processSvgNodes(html, bucket, userId, result)

      const notesCollection = db.collection("notes")
      const now = new Date()
      await notesCollection.insertOne({
        title,
        content: html,
        folderId,
        position: 0,
        userId,
        createdAt: now,
        updatedAt: now,
      })
      result.notesImported++
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Conversion failed"
    result.errors.push(message)
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

export function extractPageTitle(html: string): string {
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i)
  if (titleMatch) return titleMatch[1].trim()
  const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i)
  if (h1Match) return h1Match[1].trim()
  return ""
}

async function processImages(
  html: string,
  bucket: NonNullable<Awaited<ReturnType<typeof getBucket>>>,
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

    await new Promise<void>((resolve, reject) => {
      const uploadStream = bucket.openUploadStreamWithId(
        uploadId,
        `image-${uploadId.toHexString()}.${ext}`,
        {
          contentType: `image/${ext === "svg" ? "svg+xml" : ext}`,
          metadata: { userId, uploadedAt: new Date() },
        }
      )
      uploadStream.end(Buffer.from(base64Data, "base64"))
      uploadStream.on("finish", () => resolve())
      uploadStream.on("error", reject)
    })

    imageCount++
    replacements.push({
      start: match.index,
      end: match.index + fullMatch.length,
      newSrc: `/api/images/${uploadId.toHexString()}`,
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
  bucket: NonNullable<Awaited<ReturnType<typeof getBucket>>>,
  userId: string,
  result: OneNoteImportResult
): Promise<string> {
  const svgRegex = /<svg[^>]*>[\s\S]*?<\/svg>/gi
  const parts: string[] = []
  let lastIndex = 0
  let svgIndex = 0

  let match: RegExpExecArray | null
  while ((match = svgRegex.exec(html)) !== null) {
    parts.push(html.slice(lastIndex, match.index))
    const svgContent = match[0]
    svgIndex++
    const uploadId = new ObjectId()

    await new Promise<void>((resolve, reject) => {
      const uploadStream = bucket.openUploadStreamWithId(uploadId, `drawing-${svgIndex}.svg`, {
        contentType: "image/svg+xml",
        metadata: { userId, uploadedAt: new Date() },
      })
      uploadStream.end(Buffer.from(svgContent, "utf-8"))
      uploadStream.on("finish", () => resolve())
      uploadStream.on("error", reject)
    })

    result.imagesImported++
    parts.push(`<img src="/api/images/${uploadId.toHexString()}" alt="Drawing" />`)
    lastIndex = match.index + match[0].length
  }

  parts.push(html.slice(lastIndex))
  return parts.join("")
}
