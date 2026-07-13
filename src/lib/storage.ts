/**
 * Storage abstraction for image files.
 *
 * STORAGE_PROVIDER=local  (default)
 *   Saves images to public/uploads/ on the local filesystem.
 *   Next.js serves them as static files.
 *   Deleting a file immediately frees OS disk space.
 *
 * STORAGE_PROVIDER=r2
 *   Saves images to Cloudflare R2 via the S3-compatible API.
 *   Required env vars:
 *     CLOUDFLARE_ACCOUNT_ID   — your Cloudflare account ID
 *     R2_ACCESS_KEY_ID        — R2 API token access key
 *     R2_SECRET_ACCESS_KEY    — R2 API token secret
 *     R2_BUCKET_NAME          — bucket name
 *     R2_PUBLIC_URL           — public base URL (e.g. https://<hash>.r2.dev)
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'

const PROVIDER = (process.env.STORAGE_PROVIDER ?? 'local') as 'local' | 'r2'

// ─── Local ────────────────────────────────────────────────────────────────────

const LOCAL_DIR = join(process.cwd(), 'public', 'uploads')

async function ensureLocalDir(): Promise<void> {
  await mkdir(LOCAL_DIR, { recursive: true })
}

async function localSave(key: string, data: Buffer): Promise<void> {
  await ensureLocalDir()
  await writeFile(join(LOCAL_DIR, key), data)
}

async function localRead(key: string): Promise<Buffer | null> {
  try {
    return await readFile(join(LOCAL_DIR, key))
  } catch {
    return null
  }
}

async function localDelete(key: string): Promise<void> {
  try {
    await unlink(join(LOCAL_DIR, key))
  } catch {
    // File may already be gone — not an error
  }
}

// ─── Cloudflare R2 ────────────────────────────────────────────────────────────

let r2Client: S3Client | null = null

function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })
  }
  return r2Client
}

async function r2Save(key: string, data: Buffer, contentType: string): Promise<void> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: data,
      ContentType: contentType,
    })
  )
}

async function r2Delete(key: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  )
}

async function r2Read(key: string): Promise<Buffer | null> {
  try {
    const resp = await getR2Client().send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      })
    )
    if (!resp.Body) return null
    const chunks: Uint8Array[] = []
    for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  } catch {
    return null
  }
}

async function r2GetPresignedUrl(key: string, contentType: string, expiresIn: number): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(getR2Client(), command, { expiresIn })
}

async function r2DeleteByPrefix(prefix: string): Promise<void> {
  const listResp = await getR2Client().send(
    new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      Prefix: prefix,
    })
  )
  if (!listResp.Contents || listResp.Contents.length === 0) return
  await Promise.all(
    listResp.Contents.map((obj) =>
      obj.Key
        ? getR2Client().send(
            new DeleteObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME!,
              Key: obj.Key,
            })
          )
        : Promise.resolve()
    )
  )
}

async function r2ListByPrefix(prefix: string): Promise<string[]> {
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const listResp = await getR2Client().send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME!,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    )
    if (listResp.Contents) {
      for (const obj of listResp.Contents) {
        if (obj.Key) keys.push(obj.Key)
      }
    }
    continuationToken = listResp.NextContinuationToken
  } while (continuationToken)

  return keys
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** The storage key (filename) for a given image ID. Always .jpg since we compress to JPEG. */
export function storageKey(id: string): string {
  return `${id}.jpg`
}

/** True when the R2 provider is active. */
export function isR2(): boolean {
  return PROVIDER === 'r2'
}

/**
 * Persist image bytes to the active storage backend.
 * @param id        Hex ObjectId string (used as the storage filename)
 * @param data      JPEG-compressed image buffer
 * @param contentType  MIME type
 */
export async function storageSave(
  id: string,
  data: Buffer,
  contentType: string
): Promise<void> {
  const key = storageKey(id)
  if (isR2()) {
    await r2Save(key, data, contentType)
  } else {
    await localSave(key, data)
  }
}

/**
 * Read raw bytes for the image.
 * Local:  reads from filesystem.
 * R2:     fetches from R2 via S3 API (used by export/ZIP bundling).
 */
export async function storageRead(id: string): Promise<Buffer | null> {
  const key = storageKey(id)
  if (isR2()) return r2Read(key)
  return localRead(key)
}

/**
 * Delete image bytes from the active storage backend.
 * Space is freed immediately (no compact needed).
 */
export async function storageDelete(id: string): Promise<void> {
  const key = storageKey(id)
  if (isR2()) {
    await r2Delete(key)
  } else {
    await localDelete(key)
  }
}

/**
 * Public URL for the image (used for R2 redirect).
 * Local:  /uploads/{id}.jpg  (served as Next.js static file)
 * R2:     {R2_PUBLIC_URL}/{id}.jpg
 */
export function storagePublicUrl(id: string): string {
  if (isR2()) {
    const base = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '')
    return `${base}/${storageKey(id)}`
  }
  return `/uploads/${storageKey(id)}`
}

/**
 * Generate a presigned PUT URL for direct client-to-R2 upload.
 * The URL is time-limited and scoped to a specific key.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 900
): Promise<string> {
  if (!isR2()) {
    throw new Error("Presigned URLs require R2 storage provider")
  }
  return r2GetPresignedUrl(key, contentType, expiresIn)
}

/**
 * Delete all objects under a given R2 prefix.
 * Used to clean up temporary import files.
 */
export async function deleteByPrefix(prefix: string): Promise<void> {
  if (isR2()) {
    await r2DeleteByPrefix(prefix)
  }
}

/**
 * List all object keys under a given R2 prefix.
 * Handles pagination for >1000 objects.
 */
export async function listByPrefix(prefix: string): Promise<string[]> {
  if (isR2()) {
    return r2ListByPrefix(prefix)
  }
  return []
}

/**
 * Save raw bytes to an arbitrary key (bypasses image key mapping).
 * Used for temporary import files during async OneNote processing.
 */
export async function storageSaveRaw(key: string, data: Buffer, contentType: string): Promise<void> {
  if (isR2()) {
    await r2Save(key, data, contentType)
  } else {
    await localSave(key, data)
  }
}

/**
 * Read raw bytes from an arbitrary key (bypasses image key mapping).
 * Returns null if not found.
 */
export async function storageReadRaw(key: string): Promise<Buffer | null> {
  if (isR2()) return r2Read(key)
  return localRead(key)
}
