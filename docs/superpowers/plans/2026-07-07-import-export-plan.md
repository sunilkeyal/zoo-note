# Import / Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-level import/export of notes, folders, and images as a ZIP file with raw HTML content.

**Architecture:** Two new API routes (`GET /api/notes/export`, `POST /api/notes/import`) plus a client-side sheet component. Export queries user's notes/folders, collects image GridFS IDs, streams a ZIP with `notes.json` + image files. Import reverses the process: parse ZIP, upload images to GridFS, rewrite HTML references, create folders/notes via existing data model.

**Tech Stack:** Next.js 16, MongoDB (GridFS), `archiver` (ZIP creation), `adm-zip` (ZIP extraction), React 19, shadcn/ui

---

### Task 1: Add image extraction utility

**Files:**
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Add `extractImageIds` and `rewriteImageSrcs` functions**

```ts
// src/lib/utils.ts

const IMAGE_SRC_REGEX = /src="\/api\/images\/([a-f0-9]{24})"/gi

export function extractImageIds(html: string): string[] {
  const ids = new Set<string>()
  let match
  while ((match = IMAGE_SRC_REGEX.exec(html)) !== null) {
    ids.add(match[1])
  }
  return Array.from(ids)
}

export function rewriteImageSrcs(
  html: string,
  fromPrefix: string,
  toPrefix: string
): string {
  return html.replace(
    /src="([^"]*)"/g,
    (_, src) => {
      if (src.startsWith(fromPrefix)) {
        return `src="${src.replace(fromPrefix, toPrefix)}"`
      }
      return `src="${src}"`
    }
  )
}
```

- [ ] **Step 2: Run existing tests to verify no breakage**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add image extraction and rewriting utilities"
```

---

### Task 2: Rewrite `src/lib/export.ts` — add bulk export function

**Files:**
- Modify: `src/lib/export.ts`

- [ ] **Step 1: Add `generateExportZip` function**

Keep existing `convertHtmlToMarkdown` and `generateFrontMatter` (still used by per-note export). Add new function:

```ts
import { Note, Folder } from "@/types"
import * as archiver from "archiver"
import { Db } from "mongodb"
import { getBucket } from "@/lib/gridfs"
import { extractImageIds, rewriteImageSrcs } from "@/lib/utils"

// ... keep existing convertHtmlToMarkdown, generateFrontMatter, sanitizeFilename ...

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

export async function generateExportZip(
  notes: Note[],
  folders: Folder[],
  db: Db
): Promise<Buffer> {
  const bucket = await getBucket()
  const folderMap = new Map(folders.map((f) => [f._id, f.name]))

  // Collect unique image IDs from all notes
  const allImageIds = new Set<string>()
  for (const note of notes) {
    for (const id of extractImageIds(note.content || "")) {
      allImageIds.add(id)
    }
  }

  const manifest: ExportManifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    folders: folders.map((f) => ({ name: f.name, position: f.position })),
    notes: notes.map((n) => ({
      title: n.title,
      content: rewriteImageSrcs(
        n.content || "",
        "/api/images/",
        "images/"
      ),
      folderName: n.folderId ? folderMap.get(n.folderId) ?? null : null,
      position: n.position,
    })),
  }

  return new Promise((resolve, reject) => {
    const archive = new archiver.ZipArchive({ zlib: { level: 9 } })
    const chunks: Buffer[] = []

    archive.on("data", (chunk: Buffer) => chunks.push(chunk))
    archive.on("end", () => resolve(Buffer.concat(chunks)))
    archive.on("error", reject)

    // Add manifest
    archive.append(JSON.stringify(manifest, null, 2), { name: "notes.json" })

    // Add images
    let imagesAdded = 0
    const imagePromises: Promise<void>[] = []

    for (const id of allImageIds) {
      imagePromises.push(
        (async () => {
          try {
            const objectId = new (require("mongodb").ObjectId)(id)
            const files = await bucket.find({ _id: objectId }).toArray()
            if (files.length === 0) return
            const file = files[0]
            const ext = file.filename.split(".").pop() || "jpg"
            const chunks: Buffer[] = []
            const stream = bucket.openDownloadStream(objectId)
            for await (const chunk of stream) {
              chunks.push(chunk)
            }
            archive.append(Buffer.concat(chunks), { name: `images/${id}.${ext}` })
            imagesAdded++
          } catch {
            // Skip images that can't be read
          }
        })()
      )
    }

    Promise.all(imagePromises).then(() => {
      archive.finalize()
    }).catch(reject)
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/export.ts
git commit -m "feat: add bulk export function with image bundling"
```

---

### Task 3: Create `src/lib/import.ts`

**Files:**
- Create: `src/lib/import.ts`

- [ ] **Step 1: Create the import module**

```ts
import { Db, ObjectId } from "mongodb"
import AdmZip from "adm-zip"
import { getBucket } from "@/lib/gridfs"
import { extractImageIds, rewriteImageSrcs } from "@/lib/utils"

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

  const bucket = await getBucket()

  // 1. Upload images from ZIP to GridFS
  const imageEntries = zip.getEntries().filter((e) =>
    e.entryName.startsWith("images/") && !e.isDirectory
  )

  const imageIdMap = new Map<string, string>() // old filename (e.g. "67a1...png") → new URL

  for (const entry of imageEntries) {
    try {
      const buffer = entry.getData()
      const filename = entry.entryName.replace("images/", "")
      const ext = filename.split(".").pop() || "jpg"
      const uploadId = new ObjectId()

      await new Promise<void>((resolve, reject) => {
        const uploadStream = bucket.openUploadStreamWithId(uploadId, filename, {
          contentType: `image/${ext === "png" ? "png" : ext === "gif" ? "gif" : "jpeg"}`,
          metadata: { userId, originalName: filename, uploadedAt: new Date() },
        })
        uploadStream.end(buffer)
        uploadStream.on("finish", () => resolve())
        uploadStream.on("error", reject)
      })

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
        const result_ = await foldersCollection.insertOne({
          name: f.name,
          position: f.position,
          userId,
          createdAt: now,
          updatedAt: now,
        })
        folderNameToId.set(f.name, result_.insertedId.toString())
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
      // Rewrite image references in HTML
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
        folderId: n.folderName ? folderNameToId.get(n.folderName) ?? null : null,
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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/import.ts
git commit -m "feat: add import module for ZIP parsing, image upload, and note/folder creation"
```

---

### Task 4: Create `GET /api/notes/export` route

**Files:**
- Create: `src/app/api/notes/export/route.ts`

- [ ] **Step 1: Create the export API route**

```ts
import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { generateExportZip } from "@/lib/export"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = await connectToDatabase()

  const [notes, folders] = await Promise.all([
    db.collection("notes")
      .find({ userId: session.user.id, isDeleted: { $ne: true } })
      .sort({ position: 1, updatedAt: -1 })
      .toArray(),
    db.collection("folders")
      .find({ userId: session.user.id, isDeleted: { $ne: true } })
      .sort({ position: 1, createdAt: -1 })
      .toArray(),
  ])

  const mappedNotes = notes.map((n) => ({
    _id: n._id.toString(),
    title: n.title,
    content: n.content || "",
    folderId: n.folderId || undefined,
    userId: n.userId || undefined,
    position: n.position ?? 0,
    isFavorite: n.isFavorite ?? false,
    favoritedAt: n.favoritedAt?.toISOString?.() || n.favoritedAt || undefined,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }))

  const mappedFolders = folders.map((f) => ({
    _id: f._id.toString(),
    name: f.name,
    userId: f.userId || undefined,
    position: f.position ?? 0,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }))

  const zipBuffer = await generateExportZip(mappedNotes, mappedFolders, db)

  const dateStr = new Date().toISOString().split("T")[0]
  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="zoonote-export-${dateStr}.zip"`,
    },
  })
}
```

- [ ] **Step 2: Manual check — ensure the route is accessible**

No automated test for this yet. Visually verify the route doesn't crash.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/notes/export/route.ts
git commit -m "feat: add export API route"
```

---

### Task 5: Create `POST /api/notes/import` route

**Files:**
- Create: `src/app/api/notes/import/route.ts`

- [ ] **Step 1: Create the import API route**

```ts
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { importFromZip } from "@/lib/import"

export const config = {
  api: {
    bodyParser: false,
  },
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
  }

  if (!file.name.endsWith(".zip")) {
    return NextResponse.json({ success: false, error: "Only .zip files accepted" }, { status: 400 })
  }

  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ success: false, error: "File too large (max 10MB)" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const db = await connectToDatabase()

  try {
    const result = await importFromZip(buffer, session.user.id, db)
    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/notes/import/route.ts
git commit -m "feat: add import API route"
```

---

### Task 6: Create `ImportExportSheet.tsx` component

**Files:**
- Create: `src/components/ImportExportSheet.tsx`

- [ ] **Step 1: Create the sheet component**

```tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { X, Download, Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface ImportExportSheetProps {
  open: boolean
  onClose: () => void
}

type ExportState = "idle" | "loading"
type ImportState = "idle" | "loading" | "success" | "error"

export default function ImportExportSheet({ open, onClose }: ImportExportSheetProps) {
  const [exportState, setExportState] = useState<ExportState>("idle")
  const [importState, setImportState] = useState<ImportState>("idle")
  const [importMessage, setImportMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      setExportState("idle")
      setImportState("idle")
      setImportMessage("")
    }
  }, [open])

  async function handleExport() {
    setExportState("loading")
    try {
      const res = await fetch("/api/notes/export")
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `zoonote-export-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // silent failure — user can retry
    } finally {
      setExportState("idle")
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".zip")) {
      setImportState("error")
      setImportMessage("Only .zip files accepted")
      return
    }

    setImportState("loading")
    setImportMessage("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/notes/import", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setImportState("error")
        setImportMessage(data.error || "Import failed")
        return
      }
      const r = data.data
      setImportState("success")
      setImportMessage(
        `Imported ${r.notesImported} note${r.notesImported !== 1 ? "s" : ""}, ` +
        `${r.foldersCreated} folder${r.foldersCreated !== 1 ? "s" : ""}, ` +
        `${r.imagesImported} image${r.imagesImported !== 1 ? "s" : ""}.`
      )
    } catch {
      setImportState("error")
      setImportMessage("Network error. Please try again.")
    }
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label="Import / Export"
        aria-modal="true"
        className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Import / Export</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
          {/* Export */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Download size={16} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Export</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Download a ZIP with all your notes, folders, and images.
            </p>
            <button
              onClick={handleExport}
              disabled={exportState === "loading"}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {exportState === "loading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Exporting…
                </>
              ) : (
                "Export All Notes"
              )}
            </button>
          </div>

          {/* Import */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Upload size={16} className="text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Import</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Select a previously exported ZIP file.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importState === "loading"}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {importState === "loading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Importing…
                </>
              ) : (
                "Import Notes"
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleFileSelect}
            />
            {importState === "success" && (
              <div className="mt-3 flex items-start gap-2 text-xs text-green-600 dark:text-green-400">
                <CheckCircle size={14} className="mt-0.5 shrink-0" />
                <span>{importMessage}</span>
              </div>
            )}
            {importState === "error" && (
              <div className="mt-3 flex items-start gap-2 text-xs text-red-500">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{importMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ImportExportSheet.tsx
git commit -m "feat: add Import/Export sheet component"
```

---

### Task 7: Add Import/Export to sidebar user dropdown

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Add import and add state and sheet**

Add import for `ImportExportSheet` and `Upload` icon:
```ts
// near existing imports (line 23-24)
import ImportExportSheet from "./ImportExportSheet"

// in the lucide-react import (line 115), add Upload
import { LogOut, Settings, User as UserIcon, Rocket, LayoutDashboard, Database, Users, ScrollText, BarChart3, Upload } from "lucide-react"
```

- [ ] **Step 2: Add state variable** (near line 371)

```ts
const [importExportOpen, setImportExportOpen] = useState(false)
```

- [ ] **Step 3: Add dropdown menu item** (between Settings and Upgrade to Pro, lines 1042-1044)

```tsx
                  <DropdownMenuItem onClick={() => setImportExportOpen(true)}>
                    <Upload /> Import / Export
                  </DropdownMenuItem>
```

- [ ] **Step 4: Add sheet render** (near line 1059)

```tsx
      <ImportExportSheet open={importExportOpen} onClose={() => setImportExportOpen(false)} />
```

- [ ] **Step 5: Run build to verify no compilation errors**

Run: `npx next build` (or `npx tsc --noEmit`)
Expected: No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: add Import/Export to sidebar user dropdown"
```

---

### Self-Review Checklist

- [ ] **Spec coverage:** Export format (ZIP + JSON + images) ✓, Export API ✓, Import API ✓, Image handling ✓, Folder hierarchy ✓, Position ordering ✓, Deduplicate images in export ✓, Fresh timestamps ✓, Partial import success ✓, 10MB limit ✓, UI in sheet ✓, Sheet from dropdown ✓
- [ ] **Placeholder scan:** No TODOs, no TBDs, all code blocks filled.
- [ ] **Type consistency:** `ExportManifest` and `ImportResult` interfaces match between Task 2, 3, 4, 5. The `rewriteImageSrcs` utility used consistently.
