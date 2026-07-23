import { Db, ObjectId } from "mongodb"

export type ImportJobStatus =
  | "pending"
  | "uploading"
  | "converting"
  | "processing"
  | "completed"
  | "failed"

export interface ImportJobManifest {
  htmlFiles: string[]
  imageFiles: string[]
  sections: string[]
}

export interface ImportJob {
  _id: ObjectId
  userId: string
  filename: string
  fileSize: number
  r2Key: string
  status: ImportJobStatus
  progress: {
    totalPages: number
    processedPages: number
    currentStage: string
  }
  manifest?: ImportJobManifest
  error?: string
  result?: {
    foldersCreated: number
    notesImported: number
    imagesImported: number
  }
  /** Timestamp of the in-flight batch lock; null/absent when no batch is being processed. */
  batchLockedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const COLLECTION = "importJobs"

export async function createImportJob(
  db: Db,
  data: {
    userId: string
    filename: string
    fileSize: number
    r2Key: string
  }
): Promise<ImportJob> {
  const now = new Date()
  const doc = {
    userId: data.userId,
    filename: data.filename,
    fileSize: data.fileSize,
    r2Key: data.r2Key,
    status: "pending" as ImportJobStatus,
    progress: {
      totalPages: 0,
      processedPages: 0,
      currentStage: "Waiting for upload...",
    },
    createdAt: now,
    updatedAt: now,
  }
  const result = await db.collection(COLLECTION).insertOne(doc)
  return { ...doc, _id: result.insertedId } as ImportJob
}

export async function getImportJob(
  db: Db,
  jobId: string,
  userId: string
): Promise<ImportJob | null> {
  try {
    return await db
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(jobId), userId }) as ImportJob | null
  } catch {
    return null
  }
}

export async function updateImportJob(
  db: Db,
  jobId: string,
  update: Partial<Omit<ImportJob, "_id" | "userId" | "createdAt">>
): Promise<void> {
  await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(jobId) },
    { $set: { ...update, updatedAt: new Date() } }
  )
}

export async function getActiveImportJob(
  db: Db,
  userId: string
): Promise<ImportJob | null> {
  return db.collection(COLLECTION).findOne({
    userId,
    status: { $in: ["pending", "uploading", "converting", "processing"] },
  }) as Promise<ImportJob | null>
}

/**
 * Time after which a held batch lock is considered stale and can be re-claimed
 * (e.g. the request that held it crashed). Kept below the 10-minute "processing"
 * stale timeout so a genuinely hung batch fails the whole job rather than looping.
 */
export const BATCH_LOCK_TTL_MS = 5 * 60 * 1000

/**
 * Atomically acquire the batch-processing lock for a job. Returns the locked job
 * document if this caller won the claim, or null if the job is not in "processing"
 * state or another caller already holds a fresh lock. This prevents concurrent
 * status polls from processing the same batch twice (which would create duplicate
 * notes and duplicate images in storage).
 */
export async function claimBatchLock(db: Db, jobId: string): Promise<ImportJob | null> {
  let objectId: ObjectId
  try {
    objectId = new ObjectId(jobId)
  } catch {
    return null
  }
  const staleThreshold = new Date(Date.now() - BATCH_LOCK_TTL_MS)
  const result = await db.collection(COLLECTION).findOneAndUpdate(
    {
      _id: objectId,
      status: "processing",
      $or: [{ batchLockedAt: null }, { batchLockedAt: { $lt: staleThreshold } }],
    },
    { $set: { batchLockedAt: new Date() } },
    { returnDocument: "after" }
  )
  return (result as ImportJob | null) ?? null
}

/**
 * Release the batch lock, optionally applying a status/progress/result update in
 * the same write. Always clears `batchLockedAt` so the next poll can process the
 * following batch.
 */
export async function releaseBatchLock(
  db: Db,
  jobId: string,
  update: Partial<Omit<ImportJob, "_id" | "userId" | "createdAt">> = {}
): Promise<void> {
  await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(jobId) },
    { $set: { ...update, batchLockedAt: null, updatedAt: new Date() } }
  )
}
