import { Db, ObjectId } from 'mongodb'
import { storageSave, storageRead, storageDelete } from '@/lib/storage'

export async function saveImage(
  db: Db,
  id: ObjectId,
  filename: string,
  contentType: string,
  data: Buffer,
  metadata: { userId: string; originalName: string; uploadedAt: Date }
): Promise<void> {
  await storageSave(id.toHexString(), data, contentType)
  await db.collection("images").insertOne({
    _id: id,
    filename,
    contentType,
    length: data.length,
    metadata,
    uploadDate: new Date(),
  })
}

export async function getImageById(
  db: Db,
  id: ObjectId
): Promise<{ contentType: string; data: Buffer; length: number; filename: string; metadata: { userId?: string } } | null> {
  const doc = await db.collection("images").findOne({ _id: id })
  if (!doc) return null
  const data = await storageRead(id.toHexString())
  if (!data) return null
  return {
    contentType: doc.contentType,
    data,
    length: doc.length,
    filename: doc.filename,
    metadata: doc.metadata,
  }
}

export async function deleteImageById(db: Db, id: ObjectId): Promise<boolean> {
  await storageDelete(id.toHexString())
  const result = await db.collection("images").deleteOne({ _id: id })
  return result.deletedCount > 0
}

export function imageUrl(id: string): string {
  return `/api/images/${id}`
}
