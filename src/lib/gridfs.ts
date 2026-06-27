import { GridFSBucket, Db } from 'mongodb'
import { connectToDatabase } from '@/lib/mongodb'

let bucket: GridFSBucket | null = null

export async function getBucket(): Promise<GridFSBucket> {
  if (!bucket) {
    const db: Db = await connectToDatabase()
    bucket = new GridFSBucket(db, { bucketName: 'images' })
  }
  return bucket
}

export function imageUrl(id: string): string {
  return `/api/images/${id}`
}
