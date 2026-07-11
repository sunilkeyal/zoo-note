import { Db, ObjectId } from "mongodb"
import { execSync } from "child_process"
import { join } from "path"
import { mkdtemp, readFile, writeFile, rm, mkdir } from "fs/promises"
import { tmpdir } from "os"
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

const IS_R2 = (process.env.STORAGE_PROVIDER ?? "local") === "r2"
const BACKUP_DIR = join(process.cwd(), "backups")

let r2Client: S3Client | null = null
function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  }
  return r2Client
}

async function backupSave(key: string, data: Buffer): Promise<void> {
  if (IS_R2) {
    await getR2Client().send(
      new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key, Body: data, ContentType: "application/gzip" })
    )
  } else {
    await mkdir(BACKUP_DIR, { recursive: true })
    await writeFile(join(BACKUP_DIR, key), data)
  }
}

async function backupRead(key: string): Promise<Buffer | null> {
  if (IS_R2) {
    try {
      const resp = await getR2Client().send(
        new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key })
      )
      if (!resp.Body) return null
      const chunks: Uint8Array[] = []
      for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) chunks.push(chunk)
      return Buffer.concat(chunks)
    } catch { return null }
  }
  try {
    return await readFile(join(BACKUP_DIR, key))
  } catch { return null }
}

async function backupDelete(key: string): Promise<void> {
  if (IS_R2) {
    await getR2Client().send(
      new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key })
    ).catch(() => {})
  } else {
    await rm(join(BACKUP_DIR, key)).catch(() => {})
  }
}

export interface BackupEntry {
  _id?: ObjectId
  filename: string
  size: number
  storageKey: string
  status: "completed" | "failed" | "in_progress"
  createdAt: Date
  notes: string
}

function backupStorageKey(id: ObjectId): string {
  return `backups/backup-${id}.gz`
}

export async function createBackup(db: Db, notes: string = ""): Promise<BackupEntry> {
  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.gz`

  const entry: BackupEntry = {
    filename,
    size: 0,
    storageKey: "",
    status: "in_progress",
    createdAt: new Date(),
    notes,
  }

  const result = await db.collection<BackupEntry>("backups").insertOne(entry)
  entry._id = result.insertedId
  entry.storageKey = backupStorageKey(result.insertedId)

  try {
    const tmpDir = await mkdtemp(join(tmpdir(), "zoo-backup-"))
    const archivePath = join(tmpDir, "backup.gz")
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/zoo-note"
    execSync(`mongodump --uri="${mongoUri}" --archive="${archivePath}" --gzip`, { timeout: 300000 })

    const data = await readFile(archivePath)
    await backupSave(entry.storageKey, data)

    await db.collection<BackupEntry>("backups").updateOne(
      { _id: result.insertedId },
      { $set: { size: data.length, storageKey: entry.storageKey, status: "completed" } }
    )
    entry.size = data.length
    entry.status = "completed"

    await rm(tmpDir, { recursive: true, force: true })
  } catch (error) {
    await db.collection<BackupEntry>("backups").updateOne(
      { _id: result.insertedId },
      { $set: { status: "failed" } }
    )
    entry.status = "failed"
    throw error
  }

  return entry
}

export async function listBackups(db: Db): Promise<BackupEntry[]> {
  return db
    .collection<BackupEntry>("backups")
    .find({})
    .sort({ createdAt: -1 })
    .toArray()
}

export async function deleteBackup(db: Db, id: ObjectId): Promise<boolean> {
  const entry = await db.collection<BackupEntry>("backups").findOne({ _id: id })
  if (!entry) return false

  await backupDelete(entry.storageKey || backupStorageKey(id))
  const result = await db.collection<BackupEntry>("backups").deleteOne({ _id: id })
  return result.deletedCount > 0
}

export async function restoreBackup(db: Db, id: ObjectId): Promise<void> {
  const entry = await db.collection<BackupEntry>("backups").findOne({ _id: id })
  if (!entry) throw new Error("Backup not found")
  if (entry.status !== "completed") throw new Error("Backup is not in completed state")

  const key = entry.storageKey || backupStorageKey(id)
  const data = await backupRead(key)
  if (!data) throw new Error("Backup file not found in storage")

  const tmpDir = await mkdtemp(join(tmpdir(), "zoo-restore-"))
  const archivePath = join(tmpDir, "backup.gz")
  await writeFile(archivePath, data)

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/zoo-note"
  try {
    execSync(`mongorestore --uri="${mongoUri}" --archive="${archivePath}" --gzip --drop`, { timeout: 300000 })
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}

export async function downloadBackup(id: ObjectId): Promise<{ data: Buffer; filename: string } | null> {
  const db = await (await import("@/lib/mongodb")).connectToDatabase()
  const entry = await db.collection<BackupEntry>("backups").findOne({ _id: id })
  if (!entry) return null

  const key = entry.storageKey || backupStorageKey(id)
  const data = await backupRead(key)
  if (!data) return null

  return { data, filename: entry.filename }
}
