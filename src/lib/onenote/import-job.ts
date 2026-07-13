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
