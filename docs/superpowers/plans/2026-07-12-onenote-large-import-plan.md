# OneNote Large Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the 4MB OneNote import limit and support files up to 50MB by uploading directly to R2 via presigned URLs and processing asynchronously across multiple Vercel function invocations. Includes global import state management with persistent toast notifications, import cleanup on failure, and an admin dashboard for managing import jobs.

**Architecture:** Client uploads the .one/.onepkg file directly to R2 via a presigned PUT URL (bypasses Vercel's 4.5MB body limit). Server processes the file in stages: WASM conversion in one invocation, page processing in batches triggered by the client's polling requests (each batch stays under Vercel's 60s timeout). Job state is tracked in a new `importJobs` MongoDB collection. Every document created during import is tagged with a `jobId` for cleanup. Failed imports are automatically cleaned up. An admin dashboard provides visibility and manual cleanup capability.

**Tech Stack:** Next.js 16 App Router, MongoDB (native driver), Cloudflare R2 (S3 API), `@aws-sdk/s3-request-presigner`, existing WASM OneNote converter, sharp (image compression), React 19, shadcn/ui, sonner (toast notifications).

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Modify | Add `@aws-sdk/s3-request-presigner` and `sonner` dependencies |
| `src/lib/mongodb.ts` | Modify | Add `importJobs` collection indexes |
| `src/lib/storage.ts` | Modify | Add `getPresignedUploadUrl()`, `deleteByPrefix()`, `storageSaveRaw()`, `storageReadRaw()` |
| `src/lib/gridfs.ts` | Modify | Add `jobId` to image metadata type |
| `src/lib/onenote/import-job.ts` | Create | Job CRUD operations (create, update, getById, listActive) |
| `src/lib/onenote/import.ts` | Modify | Extract `processPagesBatch()`, `convertAndUploadToR2()`, `processLocalImagesFromR2()` with jobId tagging |
| `src/app/api/notes/import/onenote/presign/route.ts` | Create | Presigned URL endpoint |
| `src/app/api/notes/import/onenote/confirm/route.ts` | Create | Start processing after upload |
| `src/app/api/notes/import/onenote/status/route.ts` | Create | Status polling + batch processing trigger + auto-cleanup on failure |
| `src/contexts/ImportContext.tsx` | Create | Global import state with localStorage persistence |
| `src/app/providers.tsx` | Modify | Add `<Toaster />` and `<ImportProvider>` |
| `src/components/ImportExportSheet.tsx` | Modify | Use `useImport()` context, move compatibility warning above button |
| `src/app/api/admin/imports/route.ts` | Create | Admin imports list endpoint |
| `src/app/api/admin/imports/[jobId]/cleanup/route.ts` | Create | Admin cleanup endpoint |
| `src/app/admin/imports/page.tsx` | Create | Admin imports page with table, filter, sort, pagination |
| `src/components/NotesSidebar.tsx` | Modify | Add Import Jobs nav item to admin sidebar |
| `src/__tests__/onenote-large-import.test.ts` | Create | Unit tests for new functions |

---

### Task 1: Install presigner dependency

- [ ] **Step 1: Install `@aws-sdk/s3-request-presigner`**

```bash
npm install @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @aws-sdk/s3-request-presigner for R2 presigned URLs"
```

---

### Task 2: Add `importJobs` collection indexes to MongoDB

**Files:**
- Modify: `src/lib/mongodb.ts`

- [ ] **Step 1: Add importJobs indexes inside `connectToDatabase()`**

Add these three index creation blocks after the existing `images` index block (after line 56):

```typescript
  await cachedDb.collection("importJobs").createIndex(
    { userId: 1, status: 1 },
    { background: true }
  ).catch(() => {});

  await cachedDb.collection("importJobs").createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 604800, background: true }
  ).catch(() => {});

  await cachedDb.collection("importJobs").createIndex(
    { userId: 1, createdAt: -1 },
    { background: true }
  ).catch(() => {});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/mongodb.ts
git commit -m "feat: add importJobs collection indexes with TTL"
```

---

### Task 3: Add presigned URL and prefix delete to storage

**Files:**
- Modify: `src/lib/storage.ts`

- [ ] **Step 1: Add import for presigner**

Add to the existing imports at the top of `src/lib/storage.ts` (line 19):

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
```

- [ ] **Step 2: Add `r2GetPresignedUrl` function**

Add this function after `r2Read` (after line 109), before the `// ─── Public API` comment:

```typescript
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
```

- [ ] **Step 3: Add public exports**

Add these exports after `storagePublicUrl` (at the end of the file):

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: add getPresignedUploadUrl and deleteByPrefix to storage"
```

---

### Task 4: Create import job CRUD module

**Files:**
- Create: `src/lib/onenote/import-job.ts`

- [ ] **Step 1: Create `src/lib/onenote/import-job.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/onenote/import-job.ts
git commit -m "feat: add import job CRUD module for async OneNote import"
```

---

### Task 5: Refactor `import.ts` to export `processPagesBatch`

**Files:**
- Modify: `src/lib/onenote/import.ts`

The current `importOneNote` function does everything in one shot. We need to extract the page-processing logic into a reusable `processPagesBatch` function that can be called across multiple invocations. We also need a `convertAndUploadToR2` function for Stage 1.

- [ ] **Step 1: Add imports and `OneNoteImportResult` type export**

At the top of `src/lib/onenote/import.ts`, add these imports (append to existing imports):

```typescript
import { deleteByPrefix } from "@/lib/storage"
import { r2Read, r2Save } from "@/lib/storage"
```

Wait — `r2Read` and `r2Save` are not exported. We need to add generic R2 read/write helpers. Let's add a `storageReadRaw` and `storageSaveRaw` to storage.ts instead.

Actually, looking at the existing code, we should use a different approach. The converted files need to be stored temporarily in R2 during Stage 1 and read back during Stage 2-N. But `storageSave`/`storageRead` use image-specific keys (`{id}.jpg`). We need raw R2 access for temporary import files.

Let me revise: add `storageSaveRaw` and `storageReadRaw` to `storage.ts` that work with arbitrary keys.

**Revised Step 1: Add raw R2 helpers to `src/lib/storage.ts`**

Add these after the `deleteByPrefix` function (at the end of `storage.ts`):

```typescript
/**
 * Save raw bytes to an arbitrary R2 key (bypasses image key mapping).
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
 * Read raw bytes from an arbitrary R2 key (bypasses image key mapping).
 * Returns null if not found.
 */
export async function storageReadRaw(key: string): Promise<Buffer | null> {
  if (isR2()) return r2Read(key)
  return localRead(key)
}
```

- [ ] **Step 2: Add `processPagesBatch` export to `src/lib/onenote/import.ts`**

Add these new exports to `import.ts` (after the existing `importOneNote` function, before `deriveFolderName`):

```typescript
export interface PageEntry {
  r2Key: string
  fileName: string
  folderName: string
}

export interface ConvertResult {
  manifest: {
    htmlFiles: string[]
    imageFiles: string[]
    sections: string[]
  }
  totalPages: number
}

/**
 * Stage 1: Convert a OneNote buffer and upload results to R2.
 * Returns a manifest of converted files stored in R2 under `r2Prefix`.
 */
export async function convertAndUploadToR2(
  buffer: Buffer,
  originalFilename: string,
  r2Prefix: string,
  db: Db
): Promise<ConvertResult> {
  const format = detectOneNoteFormat(buffer)
  if (!format) {
    throw new Error("Unsupported file format. Accepted: .onepkg, .one")
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "onenote-"))
  const safeName = path.basename(originalFilename)
  const inputPath = path.join(tmpDir, safeName)
  await fs.writeFile(inputPath, buffer)

  const outputDir = path.join(tmpDir, "output")
  await fs.mkdir(outputDir, { recursive: true })

  try {
    await convertOneNote(inputPath, outputDir, tmpDir)

    const manifest: ImportJobManifest = { htmlFiles: [], imageFiles: [], sections: [] }
    const entries = await fs.readdir(outputDir, { withFileTypes: true })
    const subdirs = entries.filter((e) => e.isDirectory())

    const htmlFilesToUpload: { localPath: string; r2Key: string }[] = []
    const imageFilesToUpload: { localPath: string; r2Key: string }[] = []

    if (subdirs.length > 0) {
      for (const subdir of subdirs) {
        manifest.sections.push(subdir.name)
        const sectionDir = path.join(outputDir, subdir.name)
        const files = await fs.readdir(sectionDir)
        for (const f of files) {
          const localPath = path.join(sectionDir, f)
          const r2Key = `${r2Prefix}/converted/${subdir.name}/${f}`
          if (f.endsWith(".html")) {
            manifest.htmlFiles.push(r2Key)
            htmlFilesToUpload.push({ localPath, r2Key })
          } else if (IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase())) {
            manifest.imageFiles.push(r2Key)
            imageFilesToUpload.push({ localPath, r2Key })
          }
        }
        // Also check for ToC files (sectionname.html at output root)
        const tocFile = path.join(outputDir, `${subdir.name}.html`)
        try {
          await fs.access(tocFile)
          const r2Key = `${r2Prefix}/converted/${subdir.name}.html`
          htmlFilesToUpload.push({ localPath: tocFile, r2Key })
        } catch {
          // No ToC file
        }
      }
    } else {
      const htmlFiles = entries
        .filter((e) => e.isFile() && e.name.endsWith(".html"))
        .map((e) => e.name)
      for (const f of htmlFiles) {
        const folderName = deriveFolderName(f)
        if (!manifest.sections.includes(folderName)) {
          manifest.sections.push(folderName)
        }
        const localPath = path.join(outputDir, f)
        const r2Key = `${r2Prefix}/converted/${f}`
        manifest.htmlFiles.push(r2Key)
        htmlFilesToUpload.push({ localPath, r2Key })
      }
    }

    // Upload all files to R2
    for (const { localPath, r2Key } of [...htmlFilesToUpload, ...imageFilesToUpload]) {
      const data = await fs.readFile(localPath)
      const ext = path.extname(localPath).toLowerCase()
      const contentType = ext === ".html" ? "text/html" : `image/${ext.slice(1)}`
      await storageSaveRaw(r2Key, data, contentType)
    }

    return {
      manifest,
      totalPages: manifest.htmlFiles.filter((k) => k.endsWith(".html") && !k.includes(".html") || k.endsWith(".html")).length,
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}
```

Wait, this is getting complex. Let me simplify the `totalPages` calculation. The HTML files in the manifest that are page content (not ToC files) should be counted. Let me revise.

Actually, a simpler approach: the `manifest.htmlFiles` should only contain actual page HTML files (not ToC files). ToC files can be stored separately. Let me restructure.

Let me rewrite this more carefully:

```typescript
export interface ConvertResult {
  manifest: ImportJobManifest
  totalPages: number
}

/**
 * Stage 1: Convert a OneNote buffer and upload results to R2.
 * Returns a manifest of converted files stored in R2 under `r2Prefix`.
 */
export async function convertAndUploadToR2(
  buffer: Buffer,
  originalFilename: string,
  r2Prefix: string,
  _db: Db
): Promise<ConvertResult> {
  const format = detectOneNoteFormat(buffer)
  if (!format) {
    throw new Error("Unsupported file format. Accepted: .onepkg, .one")
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "onenote-"))
  const safeName = path.basename(originalFilename)
  const inputPath = path.join(tmpDir, safeName)
  await fs.writeFile(inputPath, buffer)

  const outputDir = path.join(tmpDir, "output")
  await fs.mkdir(outputDir, { recursive: true })

  try {
    await convertOneNote(inputPath, outputDir, tmpDir)

    const manifest: ImportJobManifest = { htmlFiles: [], imageFiles: [], sections: [] }
    const entries = await fs.readdir(outputDir, { withFileTypes: true })
    const subdirs = entries.filter((e) => e.isDirectory())

    const filesToUpload: { localPath: string; r2Key: string; contentType: string }[] = []

    if (subdirs.length > 0) {
      for (const subdir of subdirs) {
        manifest.sections.push(subdir.name)
        const sectionDir = path.join(outputDir, subdir.name)
        const files = await fs.readdir(sectionDir)
        for (const f of files) {
          const localPath = path.join(sectionDir, f)
          const r2Key = `${r2Prefix}/converted/${subdir.name}/${f}`
          if (f.endsWith(".html")) {
            manifest.htmlFiles.push(r2Key)
            filesToUpload.push({ localPath, r2Key, contentType: "text/html" })
          } else if (IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase())) {
            manifest.imageFiles.push(r2Key)
            const ext = path.extname(f).toLowerCase().slice(1)
            filesToUpload.push({ localPath, r2Key, contentType: `image/${ext}` })
          }
        }
      }
    } else {
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".html")) {
          const folderName = deriveFolderName(entry.name)
          if (!manifest.sections.includes(folderName)) {
            manifest.sections.push(folderName)
          }
          const localPath = path.join(outputDir, entry.name)
          const r2Key = `${r2Prefix}/converted/${entry.name}`
          manifest.htmlFiles.push(r2Key)
          filesToUpload.push({ localPath, r2Key, contentType: "text/html" })
        }
      }
    }

    for (const { localPath, r2Key, contentType } of filesToUpload) {
      const data = await fs.readFile(localPath)
      await storageSaveRaw(r2Key, data, contentType)
    }

    return { manifest, totalPages: manifest.htmlFiles.length }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}
```

- [ ] **Step 3: Add `processPagesBatch` to `src/lib/onenote/import.ts`**

```typescript
export interface BatchResult {
  pagesProcessed: number
  foldersCreated: number
  notesImported: number
  imagesImported: number
  errors: string[]
  done: boolean
}

/**
 * Stage 2-N: Process a batch of pages from R2.
 * Reads `batchSize` unprocessed pages from the manifest, processes them,
 * and returns the batch result. Call repeatedly until `done` is true.
 */
export async function processPagesBatch(
  db: Db,
  userId: string,
  manifest: ImportJobManifest,
  processedCount: number,
  batchSize: number = 10
): Promise<BatchResult> {
  const batchResult: BatchResult = {
    pagesProcessed: 0,
    foldersCreated: 0,
    notesImported: 0,
    imagesImported: 0,
    errors: [],
    done: false,
  }

  const startIdx = processedCount
  const endIdx = Math.min(startIdx + batchSize, manifest.htmlFiles.length)
  const pagesToProcess = manifest.htmlFiles.slice(startIdx, endIdx)

  // Load section page ordering from ToC files (if available)
  const sectionPageOrder = new Map<string, Map<string, number>>()
  for (const sectionName of manifest.sections) {
    const tocKey = manifest.htmlFiles.find(
      (k) => k.endsWith(`${sectionName}.html`) && !k.includes(`/${sectionName}/`)
    )
    if (tocKey) {
      try {
        const tocData = await storageReadRaw(tocKey)
        if (tocData) {
          const tocHtml = tocData.toString("utf-8")
          const order = parsePageOrderFromToc(tocHtml)
          const posMap = new Map<string, number>()
          order.forEach((filename, index) => posMap.set(filename, index))
          sectionPageOrder.set(sectionName, posMap)
        }
      } catch {
        // No ToC for this section
      }
    }
  }

  for (const htmlKey of pagesToProcess) {
    try {
      const htmlData = await storageReadRaw(htmlKey)
      if (!htmlData) {
        batchResult.errors.push(`Could not read ${htmlKey}`)
        continue
      }

      let html = htmlData.toString("utf-8")
      const fileName = path.basename(htmlKey)

      // Determine folder name from R2 key structure
      // Key format: {prefix}/converted/{section}/{file}.html or {prefix}/converted/{file}.html
      const keyParts = htmlKey.split("/converted/")
      const afterConverted = keyParts[1] || ""
      const folderName = afterConverted.includes("/")
        ? afterConverted.split("/")[0]
        : deriveFolderName(fileName)

      const title = extractPageTitle(html) || fileName.replace(/\.html$/, "")
      html = extractBodyContent(html)
      html = stripFontStyles(html)
      html = normalizeOneNoteTables(html)

      // Create or find folder
      const foldersCollection = db.collection("folders")
      let folderId: string | null = null
      const existing = await foldersCollection.findOne({
        name: folderName,
        userId,
        isDeleted: { $ne: true },
      })
      if (existing) {
        folderId = existing._id.toString()
      } else {
        const now = new Date()
        const insertResult = await foldersCollection.insertOne({
          name: folderName,
          position: 0,
          userId,
          createdAt: now,
          updatedAt: now,
        })
        folderId = insertResult.insertedId.toString()
        batchResult.foldersCreated++
      }

      // Process images: download from R2, compress, save to storage
      const localResult = await processLocalImagesFromR2(html, manifest.imageFiles, htmlKey, db, userId)
      html = localResult.cleanedHtml
      batchResult.imagesImported += localResult.imageCount

      const imgResult = await processImages(html, db, userId)
      html = imgResult.cleanedHtml
      batchResult.imagesImported += imgResult.imageCount

      const svgResult = await processSvgNodes(html, db, userId)
      html = svgResult.cleanedHtml
      batchResult.imagesImported += svgResult.imageCount

      // Insert note
      const notesCollection = db.collection("notes")
      const now = new Date()
      const position = sectionPageOrder.get(folderName)?.get(fileName) ?? 0
      await notesCollection.insertOne({
        title,
        content: html,
        folderId,
        position,
        userId,
        createdAt: now,
        updatedAt: now,
      })
      batchResult.notesImported++
      batchResult.pagesProcessed++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      batchResult.errors.push(`Failed to import ${path.basename(htmlKey)}: ${message}`)
    }
  }

  batchResult.done = endIdx >= manifest.htmlFiles.length
  return batchResult
}
```

- [ ] **Step 4: Add `processLocalImagesFromR2` helper**

Add this new function to `import.ts` (after `processLocalImages`):

```typescript
async function processLocalImagesFromR2(
  html: string,
  imageR2Keys: string[],
  pageHtmlKey: string,
  db: Db,
  userId: string
): Promise<{ cleanedHtml: string; imageCount: number }> {
  // Find image files in the same section directory as this HTML file
  const pageDir = pageHtmlKey.substring(0, pageHtmlKey.lastIndexOf("/"))
  const sectionImages = imageR2Keys.filter((k) => k.startsWith(pageDir + "/"))

  if (sectionImages.length === 0) {
    return { cleanedHtml: html, imageCount: 0 }
  }

  // Only process images actually referenced in this page's HTML
  const referencedInHtml = new Set<string>()
  const imgSrcRe = /<img[^>]+src="([^"]+)"[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = imgSrcRe.exec(html)) !== null) {
    const src = m[1]
    if (!src.startsWith("http") && !src.startsWith("data:") && !src.startsWith("//")) {
      referencedInHtml.add(path.basename(src))
    }
  }

  const imageUrlMap = new Map<string, string>()
  for (const imageKey of sectionImages) {
    const filename = path.basename(imageKey)
    if (!referencedInHtml.has(filename)) continue

    try {
      const data = await storageReadRaw(imageKey)
      if (!data) continue
      const ext = path.extname(filename).toLowerCase().slice(1)
      const uploadId = new ObjectId()
      const compressed = await compressImage(data).catch(() => data)
      await saveImage(db, uploadId, filename,
        `image/${ext === "jpg" ? "jpeg" : ext}`,
        compressed,
        { userId, originalName: filename, uploadedAt: new Date() },
      )
      imageUrlMap.set(filename, imageUrl(uploadId.toHexString()))
    } catch {
      // skip individual image failures
    }
  }

  if (imageUrlMap.size === 0) {
    return { cleanedHtml: html, imageCount: 0 }
  }

  return replaceLocalImageRefs(html, imageUrlMap)
}
```

- [ ] **Step 5: Add import for `storageSaveRaw` and `storageReadRaw`**

Update the imports at the top of `src/lib/onenote/import.ts`:

```typescript
import { saveImage, imageUrl } from "@/lib/gridfs"
import { storageSaveRaw, storageReadRaw } from "@/lib/storage"
```

Also add the import for `ImportJobManifest`:

```typescript
import type { ImportJobManifest } from "./import-job"
```

- [ ] **Step 6: Run existing tests to verify no regressions**

```bash
npm test
```

Expected: All existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/onenote/import.ts src/lib/storage.ts
git commit -m "feat: refactor OneNote import into staged convert + batch process"
```

---

### Task 6: Create presigned URL endpoint

**Files:**
- Create: `src/app/api/notes/import/onenote/presign/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { getPresignedUploadUrl } from "@/lib/storage"
import { createImportJob, getActiveImportJob } from "@/lib/onenote/import-job"

const MAX_IMPORT_SIZE = 50 * 1024 * 1024

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { filename, fileSize } = body as { filename?: string; fileSize?: number }

  if (!filename || !fileSize) {
    return NextResponse.json(
      { success: false, error: "filename and fileSize are required" },
      { status: 400 }
    )
  }

  const ext = filename.toLowerCase().split(".").pop()
  if (ext !== "onepkg" && ext !== "one") {
    return NextResponse.json(
      { success: false, error: "Unsupported file format. Accepted: .onepkg, .one" },
      { status: 400 }
    )
  }

  if (fileSize > MAX_IMPORT_SIZE) {
    return NextResponse.json(
      { success: false, error: "File too large (max 50MB)." },
      { status: 400 }
    )
  }

  const db = await connectToDatabase()
  const userId = session.user.id as string

  // Check for active import job
  const active = await getActiveImportJob(db, userId)
  if (active) {
    return NextResponse.json(
      { success: false, error: "An import is already in progress. Please wait for it to complete." },
      { status: 409 }
    )
  }

  const jobId = crypto.randomUUID()
  const r2Key = `imports/${jobId}/source.${ext}`

  const job = await createImportJob(db, {
    userId,
    filename,
    fileSize,
    r2Key,
  })

  // Update job status to uploading
  const { updateImportJob } = await import("@/lib/onenote/import-job")
  await updateImportJob(db, job._id.toHexString(), { status: "uploading" })

  try {
    const uploadUrl = await getPresignedUploadUrl(r2Key, "application/octet-stream", 900)

    return NextResponse.json({
      success: true,
      jobId: job._id.toHexString(),
      uploadUrl,
      r2Key,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate upload URL"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p src/app/api/notes/import/onenote/presign
git add src/app/api/notes/import/onenote/presign/route.ts
git commit -m "feat: add presigned URL endpoint for OneNote import"
```

---

### Task 7: Create confirm endpoint (Stage 1 trigger)

**Files:**
- Create: `src/app/api/notes/import/onenote/confirm/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { getImportJob, updateImportJob } from "@/lib/onenote/import-job"
import { convertAndUploadToR2 } from "@/lib/onenote/import"
import { storageReadRaw } from "@/lib/storage"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { jobId } = await request.json() as { jobId?: string }
  if (!jobId) {
    return NextResponse.json({ success: false, error: "jobId is required" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const userId = session.user.id as string

  const job = await getImportJob(db, jobId, userId)
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 })
  }

  if (job.status !== "uploading") {
    return NextResponse.json(
      { success: false, error: `Job is in '${job.status}' state, expected 'uploading'` },
      { status: 400 }
    )
  }

  // Start Stage 1: WASM conversion
  await updateImportJob(db, jobId, {
    status: "converting",
    progress: { totalPages: 0, processedPages: 0, currentStage: "Converting notebook..." },
  })

  try {
    // Read the uploaded file from R2
    const fileData = await storageReadRaw(job.r2Key)
    if (!fileData) {
      throw new Error("Could not read uploaded file from storage")
    }

    const r2Prefix = job.r2Key.substring(0, job.r2Key.lastIndexOf("/"))
    const convertResult = await convertAndUploadToR2(fileData, job.filename, r2Prefix, db)

    // Update job with manifest and move to processing state
    await updateImportJob(db, jobId, {
      status: "processing",
      manifest: convertResult.manifest,
      progress: {
        totalPages: convertResult.totalPages,
        processedPages: 0,
        currentStage: `Converting complete. ${convertResult.totalPages} pages found. Starting import...`,
      },
    })

    return NextResponse.json({ success: true, status: "processing", totalPages: convertResult.totalPages })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Conversion failed"
    await updateImportJob(db, jobId, { status: "failed", error: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p src/app/api/notes/import/onenote/confirm
git add src/app/api/notes/import/onenote/confirm/route.ts
git commit -m "feat: add confirm endpoint for OneNote import Stage 1"
```

---

### Task 8: Create status endpoint with poll-triggered processing

**Files:**
- Create: `src/app/api/notes/import/onenote/status/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { getImportJob, updateImportJob } from "@/lib/onenote/import-job"
import { processPagesBatch } from "@/lib/onenote/import"
import { deleteByPrefix } from "@/lib/storage"

const BATCH_SIZE = 10
const STALE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const jobId = request.nextUrl.searchParams.get("jobId")
  if (!jobId) {
    return NextResponse.json({ success: false, error: "jobId is required" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const userId = session.user.id as string

  const job = await getImportJob(db, jobId, userId)
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 })
  }

  // Check for stale jobs
  const elapsed = Date.now() - job.updatedAt.getTime()
  if (job.status === "processing" && elapsed > STALE_TIMEOUT_MS) {
    await updateImportJob(db, jobId, {
      status: "failed",
      error: "Import timed out (no progress for 10 minutes)",
    })
    return NextResponse.json({
      status: "failed",
      error: "Import timed out",
    })
  }

  // Poll-triggered processing: if job is in "processing" state, process a batch
  if (job.status === "processing" && job.manifest) {
    try {
      const batchResult = await processPagesBatch(
        db,
        userId,
        job.manifest,
        job.progress.processedPages,
        BATCH_SIZE
      )

      const newProcessed = job.progress.processedPages + batchResult.pagesProcessed
      const newFolders = job.progress.totalPages > 0 ? batchResult.foldersCreated : 0

      if (batchResult.done) {
        // Clean up temporary R2 files
        const r2Prefix = job.r2Key.substring(0, job.r2Key.lastIndexOf("/"))
        await deleteByPrefix(r2Prefix).catch(() => {})

        // Also delete the source file
        const sourcePrefix = job.r2Key.substring(0, job.r2Key.lastIndexOf("/") + 1)
        await deleteByPrefix(sourcePrefix).catch(() => {})

        await updateImportJob(db, jobId, {
          status: "completed",
          progress: {
            totalPages: job.progress.totalPages,
            processedPages: newProcessed,
            currentStage: "Import complete!",
          },
          result: {
            foldersCreated: batchResult.foldersCreated,
            notesImported: batchResult.notesImported,
            imagesImported: batchResult.imagesImported,
          },
        })
      } else {
        await updateImportJob(db, jobId, {
          progress: {
            totalPages: job.progress.totalPages,
            processedPages: newProcessed,
            currentStage: `Importing page ${newProcessed}/${job.progress.totalPages}...`,
          },
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing failed"
      await updateImportJob(db, jobId, { status: "failed", error: message })
      return NextResponse.json({ status: "failed", error: message })
    }
  }

  // Return current status
  const updatedJob = await getImportJob(db, jobId, userId)
  if (!updatedJob) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 })
  }

  return NextResponse.json({
    status: updatedJob.status,
    progress: updatedJob.progress,
    result: updatedJob.result,
    error: updatedJob.error,
  })
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p src/app/api/notes/import/onenote/status
git add src/app/api/notes/import/onenote/status/route.ts
git commit -m "feat: add status endpoint with poll-triggered batch processing"
```

---

### Task 9: Update ImportExportSheet to use ImportContext

**Files:**
- Modify: `src/components/ImportExportSheet.tsx`

**Note:** Task 15 (ImportContext) must be completed first. Task 16 (this task) refactors ImportExportSheet to use the global context instead of managing its own import state.

- [ ] **Step 1: Replace local import state with `useImport()`**

  Remove all local import state variables (`onenoteImportState`, `onenoteImportMessage`, `uploadProgress`, `onenoteJobId`) and the local `handleOneNoteFileSelect`, `uploadFileToR2`, and `pollImportStatus` functions. Replace with:

  ```typescript
  const { job, startImport, resetJob } = useImport()
  ```

  Derive display state from `job.status` and `job.progress`.

- [ ] **Step 2: Update `handleOneNoteFileSelect` to call `startImport`**

  ```typescript
  async function handleOneNoteFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await startImport(file)
  }
  ```

- [ ] **Step 3: Update progress display to use `job` state**

  Replace all `onenoteImportState` / `onenoteImportMessage` references with `job.status` / `job.progress.currentStage` / `job.error` / `job.result`.

- [ ] **Step 4: Move compatibility warning above the Select File button**

  Move the amber compatibility warning (`Best compatibility with OneNote 2016+ on Windows...`) from below the progress bar to above the "Select File" button, before the hidden file input.

- [ ] **Step 5: Reset job on close**

  In the `useEffect` that resets states when the sheet closes, call `resetJob()` instead of the old state resets.

- [ ] **Step 6: Remove unused imports**

  Remove `Loader2`, `CheckCircle`, `AlertCircle` if they are no longer used in this component (they are used by the ImportContext/sonner system now).

- [ ] **Step 7: Commit**

```bash
git add src/components/ImportExportSheet.tsx
git commit -m "refactor: ImportExportSheet uses global ImportContext, move compatibility warning above button"
```

---

### Task 10: Update existing route for backward compatibility

**Files:**
- Modify: `src/app/api/notes/import/onenote/route.ts`

- [ ] **Step 1: Raise the size limit on the existing route**

Change line 27 from:

```typescript
const MAX_SIZE = 4 * 1024 * 1024
```

To:

```typescript
const MAX_SIZE = 50 * 1024 * 1024
```

This keeps the synchronous import path functional for any client that still uses it directly (e.g., API integrations), but the UI will use the new async flow.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/notes/import/onenote/route.ts
git commit -m "chore: raise sync import limit to 50MB for backward compat"
```

---

### Task 11: Write unit tests

**Files:**
- Create: `src/__tests__/onenote-large-import.test.ts`

- [ ] **Step 1: Create test file**

```typescript
import { describe, it, expect } from "vitest"
import { detectOneNoteFormat } from "@/lib/onenote/import"

describe("OneNote large import", () => {
  describe("detectOneNoteFormat", () => {
    it("detects .one format from magic bytes", () => {
      const magic = Buffer.from([
        0xE4, 0x52, 0x5C, 0x7B, 0x8C, 0xD8, 0xA7, 0x4D,
        0xAE, 0xB1, 0x53, 0x78, 0xD0, 0x29, 0x96, 0xD3,
      ])
      const buffer = Buffer.concat([magic, Buffer.alloc(100)])
      expect(detectOneNoteFormat(buffer)).toBe("one")
    })

    it("detects .onepkg format from MSCF header", () => {
      const header = Buffer.from("MSCF")
      const buffer = Buffer.concat([header, Buffer.alloc(100)])
      expect(detectOneNoteFormat(buffer)).toBe("onepkg")
    })

    it("returns null for unknown format", () => {
      const buffer = Buffer.from("PK\x03\x04")
      expect(detectOneNoteFormat(buffer)).toBeNull()
    })

    it("returns null for too-small buffer", () => {
      const buffer = Buffer.from("MSC")
      expect(detectOneNoteFormat(buffer)).toBeNull()
    })
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/onenote-large-import.test.ts
git commit -m "test: add unit tests for OneNote import format detection"
```

---

### Task 12: Final verification

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Verify all files are in order**

Check that all new and modified files exist and are correctly structured:
- `src/lib/onenote/import-job.ts` — job CRUD
- `src/lib/onenote/import.ts` — updated with new exports, jobId tagging, cleanup helper
- `src/lib/storage.ts` — presigned URL, raw read/write, prefix delete
- `src/lib/gridfs.ts` — jobId in metadata type
- `src/lib/mongodb.ts` — importJobs indexes
- `src/app/api/notes/import/onenote/presign/route.ts` — presign endpoint
- `src/app/api/notes/import/onenote/confirm/route.ts` — confirm endpoint
- `src/app/api/notes/import/onenote/status/route.ts` — status + auto-cleanup
- `src/contexts/ImportContext.tsx` — global import state
- `src/app/providers.tsx` — Toaster + ImportProvider
- `src/components/ImportExportSheet.tsx` — uses ImportContext
- `src/app/api/admin/imports/route.ts` — admin list endpoint
- `src/app/api/admin/imports/[jobId]/cleanup/route.ts` — admin cleanup endpoint
- `src/app/admin/imports/page.tsx` — admin imports page
- `src/components/NotesSidebar.tsx` — admin sidebar Import Jobs item
- `src/__tests__/onenote-large-import.test.ts` — tests

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address lint/build issues"
```

---

### Task 13: Add jobId tagging to all import-created documents

- [ ] **Step 1: Update `processPagesBatch` in `src/lib/onenote/import.ts`**

  - Accept `jobId` parameter
  - Pass `jobId` when creating folders and notes
  - Accumulate cumulative result counts across batches (not just per-batch)

- [ ] **Step 2: Update `processLocalImagesFromR2` in `src/lib/onenote/import.ts`**

  - Accept `jobId` parameter
  - Pass `jobId` in GridFS metadata when saving images

- [ ] **Step 3: Update all callers to pass `jobId`**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: tag import-created documents with jobId for cleanup tracking"
```

---

### Task 14: Add auto-cleanup on import failure

- [ ] **Step 1: Create `cleanupImportData` helper in `src/lib/onenote/import.ts`**

  - Accept `userId` and `jobId`
  - Delete notes by jobId, folders by jobId, GridFS images by jobId, R2 files by r2Prefix
  - Wrap in try/catch, swallow errors to avoid cascading failures

- [ ] **Step 2: Add cleanup to `POST /api/notes/import/onenote/status`**

  - In server error catch block: call `cleanupImportData`
  - In stale timeout handler: call `cleanupImportData`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: auto-cleanup import data on failure or stale timeout"
```

---

### Task 15: Create global ImportContext with toasts

- [ ] **Step 1: Create `src/contexts/ImportContext.tsx`**

  - State: job (jobId, status, filename, progress, result, error)
  - Methods: `startImport(file)`, `resetJob()`
  - localStorage persistence for job ID
  - 3-second polling interval, stopped on terminal states
  - Auto-refresh notes/folders on import completion
  - Toast notifications via sonner

- [ ] **Step 2: Update `src/app/providers.tsx`**

  - Add `<Toaster />` and `<ImportProvider>`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add ImportContext with localStorage persistence and sonner toasts"
```

---

### Task 16: Update ImportExportSheet to use ImportContext

- [ ] **Step 1: Refactor `src/components/ImportExportSheet.tsx`**

  - Replace local state with `useImport()` context
  - Move compatibility warning above the Select File button
  - Use `onOpenChange` to reset job state on close

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor: ImportExportSheet uses global ImportContext"
```

---

### Task 17: Add admin imports API endpoints

- [ ] **Step 1: Create `src/app/api/admin/imports/route.ts`**

  - GET: paginated list with user email resolution, status filter, sorting
  - Admin auth enforced

- [ ] **Step 2: Create `src/app/api/admin/imports/[jobId]/cleanup/route.ts`**

  - POST: validate failed status, clean up notes/folders/images/R2 files/importJobs
  - Admin auth enforced

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add admin imports list and cleanup API endpoints"
```

---

### Task 18: Add admin imports page

- [ ] **Step 1: Create `src/app/admin/imports/page.tsx`**

  - Table with sortable columns (Filename, Status, Created)
  - Status filter (All/Failed/Completed/Processing)
  - Trash-style pagination with rows-per-page selector
  - Cleanup confirmation dialog for failed jobs
  - Follows existing admin page patterns (useSearchParams, usePathname)

- [ ] **Step 2: Update admin sidebar in `src/components/NotesSidebar.tsx`**

  - Add "Import Jobs" nav item with Upload icon to `adminItems` array

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add admin imports dashboard page with sortable table and cleanup"
```

---

### Task 19: Update tests and final verification

- [ ] **Step 1: Update `src/__tests__/notes-sidebar.test.tsx`**

  - Wrap components in `ImportContext` provider mock

- [ ] **Step 2: Update `src/__tests__/trash-context-menu.test.tsx`**

  - Add ImportContext mock

- [ ] **Step 3: Run full verification**

```bash
npx vitest run
npm run lint
npm run build
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "test: add ImportContext mocks to component tests"
```

---

### Task 20: Final commit and push

- [ ] **Step 1: Push all changes**

```bash
git push origin feature/onenote-large-import
```

- [ ] **Step 2: Verify build passes on remote**

```bash
npm run build
```
