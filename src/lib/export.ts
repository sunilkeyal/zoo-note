import TurndownService from "turndown"
import { Note, Folder } from "@/types"
import * as yaml from "js-yaml"
import * as archiver from "archiver"
import { Db, ObjectId } from "mongodb"
import { getBucket } from "@/lib/gridfs"
import { extractImageIds, rewriteImageSrcs } from "@/lib/utils"

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
  _db: Db
): Promise<Buffer> {
  const bucket = await getBucket()
  const folderMap = new Map(folders.map((f) => [f._id, f.name]))

  const allImageIds = new Set<string>()
  for (const note of notes) {
    for (const id of extractImageIds(note.content || "")) {
      allImageIds.add(id)
    }
  }

  const manifest: ExportManifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    folders: folders.map((f) => ({ name: f.name, position: f.position })),
    notes: notes.map((n) => ({
      title: n.title,
      content: rewriteImageSrcs(
        n.content || "",
        "/api/images/",
        "images/"
      ),
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

    const imagePromises: Promise<void>[] = []

    for (const id of allImageIds) {
      imagePromises.push(
        (async () => {
          try {
            const objectId = new ObjectId(id)
            const files = await bucket.find({ _id: objectId }).toArray()
            if (files.length === 0) return
            const file = files[0]
            const ext = file.filename.split(".").pop() || "jpg"
            const chunks: Buffer[] = []
            const stream = bucket.openDownloadStream(objectId)
            for await (const chunk of stream) {
              chunks.push(chunk)
            }
            archive.append(Buffer.concat(chunks), { name: `images/${id}.${ext}` })
          } catch {
            // Skip images that can't be read
          }
        })()
      )
    }

    Promise.all(imagePromises).then(() => {
      archive.finalize()
    }).catch(reject)
  })
}
