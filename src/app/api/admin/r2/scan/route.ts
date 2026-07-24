import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { isR2 } from "@/lib/storage"
import { ObjectId } from "mongodb"

interface ScannedPrefix {
  prefix: string
  jobId: string | null
  jobExists: boolean
  jobStatus: string | null
  fileCount: number
  totalBytes: number
  htmlFileCount: number
  hasConverted: boolean
}

interface ScanSummary {
  imports: ScannedPrefix[]
  imageFiles: { count: number; totalBytes: number }
  otherFiles: { count: number; totalBytes: number }
  totalObjects: number
  totalBytes: number
}

export async function POST() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  if (!isR2()) {
    return NextResponse.json({ success: false, error: "R2 scan is only available with R2 storage provider." }, { status: 400 })
  }

  const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3")
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  // List ALL objects in the bucket
  const allObjects: { key: string; size: number }[] = []
  let continuationToken: string | undefined

  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    }))

    for (const obj of res.Contents ?? []) {
      if (obj.Key) {
        allObjects.push({ key: obj.Key, size: obj.Size ?? 0 })
      }
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (continuationToken)

  if (allObjects.length === 0) {
    return NextResponse.json({ success: true, data: { imports: [], imageFiles: { count: 0, totalBytes: 0 }, otherFiles: { count: 0, totalBytes: 0 }, totalObjects: 0, totalBytes: 0 } })
  }

  // Categorize objects
  const importObjects: { key: string; size: number }[] = []
  const imageObjects: { key: string; size: number }[] = []
  const otherObjects: { key: string; size: number }[] = []

  for (const obj of allObjects) {
    if (obj.key.startsWith("imports/")) {
      importObjects.push(obj)
    } else if (obj.key.endsWith(".jpg") || obj.key.endsWith(".jpeg") || obj.key.endsWith(".png") || obj.key.endsWith(".svg") || obj.key.endsWith(".gif") || obj.key.endsWith(".webp")) {
      imageObjects.push(obj)
    } else {
      otherObjects.push(obj)
    }
  }

  // Group import objects by imports/{jobId}/ prefix
  const prefixMap = new Map<string, { keys: string[]; totalBytes: number }>()
  for (const obj of importObjects) {
    const parts = obj.key.split("/")
    if (parts.length >= 2) {
      const prefix = `${parts[0]}/${parts[1]}/`
      const existing = prefixMap.get(prefix) ?? { keys: [], totalBytes: 0 }
      existing.keys.push(obj.key)
      existing.totalBytes += obj.size
      prefixMap.set(prefix, existing)
    }
  }

  // Check which jobIds still exist in MongoDB
  const jobIds = Array.from(prefixMap.keys())
    .map((prefix) => {
      const id = prefix.split("/")[1]
      try {
        return new ObjectId(id)
      } catch {
        return null
      }
    })
    .filter((id): id is ObjectId => id !== null)

  const db = await connectToDatabase()
  const existingJobs = await db
    .collection("importJobs")
    .find({ _id: { $in: jobIds } }, { projection: { _id: 1, status: 1 } })
    .toArray()
  const existingJobMap = new Map(existingJobs.map((j) => [j._id.toString(), j.status]))

  // Build import prefix results
  const imports: ScannedPrefix[] = Array.from(prefixMap.entries()).map(([prefix, data]) => {
    const jobId = prefix.split("/")[1]
    const htmlCount = data.keys.filter((k) => k.endsWith(".html") && k.includes("/converted/")).length
    return {
      prefix,
      jobId,
      jobExists: existingJobMap.has(jobId),
      jobStatus: existingJobMap.get(jobId) ?? null,
      fileCount: data.keys.length,
      totalBytes: data.totalBytes,
      htmlFileCount: htmlCount,
      hasConverted: htmlCount > 0,
    }
  })

  // Sort: orphaned (no job) first, then by size descending
  imports.sort((a, b) => {
    if (a.jobExists !== b.jobExists) return a.jobExists ? 1 : -1
    return b.totalBytes - a.totalBytes
  })

  const imageBytes = imageObjects.reduce((sum, o) => sum + o.size, 0)
  const otherBytes = otherObjects.reduce((sum, o) => sum + o.size, 0)
  const importBytes = importObjects.reduce((sum, o) => sum + o.size, 0)
  const totalBytes = imageBytes + otherBytes + importBytes

  return NextResponse.json({
    success: true,
    data: {
      imports,
      imageFiles: { count: imageObjects.length, totalBytes: imageBytes },
      otherFiles: { count: otherObjects.length, totalBytes: otherBytes },
      totalObjects: allObjects.length,
      totalBytes,
    },
  })
}
