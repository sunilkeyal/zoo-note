import TurndownService from "turndown"
import { Note, Folder } from "@/types"
import * as yaml from "js-yaml"
import * as archiver from "archiver"
import { Db, ObjectId } from "mongodb"
import { getImageById } from "@/lib/gridfs"
import { extractImageIds } from "@/lib/utils"

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
})

export function convertHtmlToMarkdown(html: string): string {
  return turndown.turndown(html || "")
}

export function generateFrontMatter(title: string, folderName?: string): string {
  const data: Record<string, string> = { title }
  if (folderName) {
    data.folder = folderName
  }
  return "---\n" + yaml.dump(data) + "---\n\n"
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_").trim() || "untitled"
}

interface ExportManifest {
  version: number
  exportedAt: string
  folders: { name: string; position: number }[]
  notes: {
    title: string
    content: string
    folderName: string | null
    position: number
  }[]
}

export async function generateExportZip(
  notes: Note[],
  folders: Folder[],
  db: Db
): Promise<Buffer> {
  const folderMap = new Map(folders.map((f) => [f._id, f.name]))

  const allImageIds = new Set<string>()
  for (const note of notes) {
    for (const id of extractImageIds(note.content || "")) {
      allImageIds.add(id)
    }
  }

  const successImages: { id: string; ext: string; buffer: Buffer }[] = []
  await Promise.allSettled(
    Array.from(allImageIds).map(async (id) => {
      const objectId = new ObjectId(id)
      const img = await getImageById(db, objectId)
      if (!img) return
      const ext = img.filename.split(".").pop() || "jpg"
      successImages.push({ id, ext, buffer: img.data })
    })
  )

  // extMap only contains images we actually bundled in the zip
  const extMap = new Map(successImages.map(({ id, ext }) => [id, ext]))

  function rewriteExportSrcs(html: string): string {
    let result = html
    for (const [id, ext] of extMap) {
      result = result.replace(
        new RegExp(`src="/api/images/${id}"`, "g"),
        `src="images/${id}.${ext}"`
      )
    }
    return result
  }

  const manifest: ExportManifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    folders: folders.map((f) => ({ name: f.name, position: f.position })),
    notes: notes.map((n) => ({
      title: n.title,
      content: rewriteExportSrcs(n.content || ""),
      folderName: n.folderId ? folderMap.get(n.folderId) ?? null : null,
      position: n.position,
    })),
  }

  return new Promise((resolve, reject) => {
    const archive = new archiver.ZipArchive({ zlib: { level: 9 } })
    const chunks: Buffer[] = []

    archive.on("data", (chunk: Buffer) => chunks.push(chunk))
    archive.on("end", () => resolve(Buffer.concat(chunks)))
    archive.on("error", reject)

    archive.append(JSON.stringify(manifest, null, 2), { name: "notes.json" })
    for (const { id, ext, buffer } of successImages) {
      archive.append(buffer, { name: `images/${id}.${ext}` })
    }
    archive.finalize()
  })
}
