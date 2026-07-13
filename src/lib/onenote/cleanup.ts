import { deleteByPrefix } from "@/lib/storage"
import type { Db } from "mongodb"

export async function cleanupImportData(db: Db, jobId: string, r2Key: string) {
  const notesResult = await db.collection("notes").deleteMany({ jobId })
  const foldersResult = await db.collection("folders").deleteMany({ jobId })
  const imagesCollection = db.collection("images")
  const imageDocs = await imagesCollection
    .find({ "metadata.jobId": jobId }, { projection: { _id: 1 } })
    .toArray()
  if (imageDocs.length > 0) {
    const imageIds = imageDocs.map((doc) => doc._id)
    await imagesCollection.deleteMany({ _id: { $in: imageIds } })
    await db.collection("gridfs.chunks").deleteMany({ files_id: { $in: imageIds } })
  }
  const r2Prefix = r2Key.substring(0, r2Key.lastIndexOf("/"))
  await deleteByPrefix(r2Prefix).catch(() => {})
  return {
    notesDeleted: notesResult.deletedCount,
    foldersDeleted: foldersResult.deletedCount,
    imagesDeleted: imageDocs.length,
  }
}
