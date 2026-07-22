import { Db, ObjectId } from "mongodb"
import AdmZip from "adm-zip"
import { saveImage } from "@/lib/gridfs"

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

interface ImportResult {
  notesImported: number
  foldersCreated: number
  imagesImported: number
  errors: string[]
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function importFromZip(
  zipBuffer: Buffer,
  userId: string,
  db: Db
): Promise<ImportResult> {
  const result: ImportResult = {
    notesImported: 0,
    foldersCreated: 0,
    imagesImported: 0,
    errors: [],
  }

  let zip: AdmZip
  try {
    zip = new AdmZip(zipBuffer)
  } catch {
    throw new Error("Invalid ZIP file")
  }

  const manifestEntry = zip.getEntry("notes.json")
  if (!manifestEntry) {
    throw new Error("Invalid export file: missing notes.json")
  }

  let manifest: ExportManifest
  try {
    manifest = JSON.parse(manifestEntry.getData().toString("utf-8"))
  } catch {
    throw new Error("Invalid export file: notes.json is not valid JSON")
  }

  if (manifest.version !== 1) {
    throw new Error(`Unsupported export version: ${manifest.version}`)
  }

  const imageEntries = zip
    .getEntries()
    .filter((e) => {
      // Reject entries with path traversal or absolute paths
      if (e.entryName.includes("..") || e.entryName.startsWith("/")) return false
      return e.entryName.startsWith("images/") && !e.isDirectory
    })

  const imageIdMap = new Map<string, string>()

  for (const entry of imageEntries) {
    try {
      const buffer = entry.getData()
      const filename = entry.entryName.replace("images/", "")
      const ext = filename.split(".").pop() || "jpg"
      const uploadId = new ObjectId()

      await saveImage(db, uploadId, filename,
        `image/${ext === "png" ? "png" : ext === "gif" ? "gif" : "jpeg"}`,
        buffer,
        { userId, originalName: filename, uploadedAt: new Date() },
      )

      imageIdMap.set(filename, uploadId.toHexString())
      result.imagesImported++
    } catch {
      result.errors.push(`Failed to import image: ${entry.entryName}`)
    }
  }

  // 2. Create folders
  const folderNameToId = new Map<string, string>()
  const foldersCollection = db.collection("folders")

  for (const f of manifest.folders) {
    try {
      const existing = await foldersCollection.findOne({
        name: f.name,
        userId,
        isDeleted: { $ne: true },
      })
      if (existing) {
        folderNameToId.set(f.name, existing._id.toString())
      } else {
        const now = new Date()
        const insertResult = await foldersCollection.insertOne({
          name: f.name,
          position: f.position,
          userId,
          createdAt: now,
          updatedAt: now,
        })
        folderNameToId.set(f.name, insertResult.insertedId.toString())
        result.foldersCreated++
      }
    } catch {
      result.errors.push(`Failed to create folder: ${f.name}`)
    }
  }

  // 3. Create notes
  const notesCollection = db.collection("notes")

  for (const n of manifest.notes) {
    try {
      // Rewrite image references in HTML from ZIP paths back to API paths
      let content = n.content || ""
      for (const [oldFilename, newId] of imageIdMap) {
        content = content.replace(
          new RegExp(`src="images/${escapeRegex(oldFilename)}"`, "g"),
          `src="/api/images/${newId}"`
        )
      }

      const now = new Date()
      await notesCollection.insertOne({
        title: n.title,
        content,
        folderId: n.folderName ? (folderNameToId.get(n.folderName) ?? null) : null,
        position: n.position,
        userId,
        createdAt: now,
        updatedAt: now,
      })
      result.notesImported++
    } catch {
      result.errors.push(`Failed to create note: ${n.title}`)
    }
  }

  return result
}
