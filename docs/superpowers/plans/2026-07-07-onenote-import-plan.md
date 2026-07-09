# OneNote Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import OneNote `.onepkg` (notebook) and `.one` (section) files into the app as folders and notes.

**Architecture:** Upload → temp dir on disk → vendored WASM (`@joplin/onenote-converter` built to `--target nodejs`) parses binary and writes HTML per page → read HTML → extract base64/SVG images → upload to GridFS → rewrite `<img>` src → create folders + notes in MongoDB. The WASM binary is prebuilt from Rust source and vendored in the repo (no Rust needed at deploy time).

**Tech Stack:** Next.js, MongoDB, GridFS, `@joplin/onenote-converter` (vendored WASM), `adm-zip`

---

### Task 0: Install Rust toolchain, build WASM, vendor files

**Files:**
- Create: `src/lib/onenote/vendor/renderer.js`
- Create: `src/lib/onenote/vendor/renderer_bg.wasm`
- Create: `src/lib/onenote/vendor/renderer.d.ts`
- Modify: `package.json` (already has `@joplin/onenote-converter: ^3.6.3`)

- [ ] **Step 1: Verify Rust toolchain is installed**

Run: `rustc --version`
Expected: prints version like `rustc 1.xx.x`

If not found, install:
```powershell
winget install Rustup.Rustup
```
Then restart terminal and run:
```powershell
rustup target add wasm32-unknown-unknown
```

- [ ] **Step 2: Ensure wasm-pack is available**

Run from project root:
```powershell
npm ls wasm-pack
```
If not installed globally, install it:
```powershell
npm install -g wasm-pack
```

- [ ] **Step 3: Build WASM from the onenote-converter source**

```powershell
Set-Location -LiteralPath "node_modules/@joplin/onenote-converter"
wasm-pack build --target nodejs --release ./renderer
Set-Location -LiteralPath "../.."
```

Expected: `node_modules/@joplin/onenote-converter/renderer/pkg/` now contains `renderer.js`, `renderer_bg.wasm`, `renderer.d.ts`.

- [ ] **Step 4: Create vendored directory and copy built files**

```powershell
New-Item -ItemType Directory -Path "src/lib/onenote/vendor" -Force
Copy-Item "node_modules/@joplin/onenote-converter/renderer/pkg/renderer.js" "src/lib/onenote/vendor/"
Copy-Item "node_modules/@joplin/onenote-converter/renderer/pkg/renderer_bg.wasm" "src/lib/onenote/vendor/"
Copy-Item "node_modules/@joplin/onenote-converter/renderer/pkg/renderer.d.ts" "src/lib/onenote/vendor/"
```

- [ ] **Step 5: Add a `.gitattributes` entry to handle the `.wasm` binary**

Add to `.gitattributes` (create if not exists):
```
*.wasm binary
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/onenote/vendor/ .gitattributes
git commit -m "feat: add vendored OneNote WASM converter"
```

---

### Task 1: Create vendored WASM wrapper (`convert.ts`)

**Files:**
- Create: `src/lib/onenote/convert.ts`

This module loads the vendored WASM and exposes a typed `convertOneNote` function.

- [ ] **Step 1: Write `convert.ts`**

```typescript
import { oneNoteConverter } from "./vendor/renderer.js"
import path from "path"
import fs from "fs/promises"

export async function convertOneNote(
  inputPath: string,
  outputDir: string,
  basePath: string
): Promise<void> {
  try {
    // The WASM function is synchronous but does file I/O
    oneNoteConverter(inputPath, outputDir, basePath)
  } catch (err) {
    throw new Error(
      `OneNote conversion failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/onenote/convert.ts
git commit -m "feat: add vendored WASM wrapper for OneNote conversion"
```

---

### Task 2: Create the import pipeline (`import.ts`)

**Files:**
- Create: `src/lib/onenote/import.ts`

This module contains the full import logic: format detection, temp file handling, WASM conversion, HTML parsing, image extraction/upload, and DB record creation.

- [ ] **Step 1: Write `import.ts`**

```typescript
import { Db, ObjectId } from "mongodb"
import { getBucket } from "@/lib/gridfs"
import { convertOneNote } from "./convert"
import path from "path"
import fs from "fs/promises"
import os from "os"

interface OneNoteImportResult {
  foldersCreated: number
  notesImported: number
  imagesImported: number
  errors: string[]
}

const ONENOTE_MAGIC = Buffer.from([
  0xE4, 0x52, 0x5C, 0x7B, 0x8C, 0xD8, 0xA7, 0x4D,
  0xAE, 0xB1, 0x53, 0x78, 0xD0, 0x29, 0x96, 0xD3,
])

function hasOneNoteMagic(buffer: Buffer): boolean {
  return buffer.length >= 16 && buffer.subarray(0, 16).equals(ONENOTE_MAGIC)
}

function isOnepkg(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "MSCF"
}

export function detectOneNoteFormat(buffer: Buffer): "one" | "onepkg" | null {
  if (hasOneNoteMagic(buffer)) return "one"
  if (isOnepkg(buffer)) return "onepkg"
  return null
}

export async function importOneNote(
  buffer: Buffer,
  userId: string,
  db: Db
): Promise<OneNoteImportResult> {
  const result: OneNoteImportResult = {
    foldersCreated: 0,
    notesImported: 0,
    imagesImported: 0,
    errors: [],
  }

  const format = detectOneNoteFormat(buffer)
  if (!format) {
    throw new Error("Unsupported file format. Accepted: .onepkg, .one")
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "onenote-"))
  const ext = format === "onepkg" ? ".onepkg" : ".one"
  const inputPath = path.join(tmpDir, `import${ext}`)
  await fs.writeFile(inputPath, buffer)

  const outputDir = path.join(tmpDir, "output")
  await fs.mkdir(outputDir, { recursive: true })

  try {
    await convertOneNote(inputPath, outputDir, tmpDir)

    const htmlFiles = (await fs.readdir(outputDir)).filter((f) => f.endsWith(".html"))

    if (htmlFiles.length === 0) {
      result.errors.push("No pages found in the OneNote file")
      return result
    }

    const bucket = await getBucket()

    for (const htmlFile of htmlFiles) {
      const htmlPath = path.join(outputDir, htmlFile)
      let html = await fs.readFile(htmlPath, "utf-8")

      const folderName = deriveFolderName(htmlFile)

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
        result.foldersCreated++
      }

      const title = extractPageTitle(html) || htmlFile.replace(/\.html$/, "")

      const { cleanedHtml, imageCount } = await processImages(html, bucket, userId)
      html = cleanedHtml
      result.imagesImported += imageCount

      html = await processSvgNodes(html, bucket, userId, result)

      const notesCollection = db.collection("notes")
      const now = new Date()
      await notesCollection.insertOne({
        title,
        content: html,
        folderId,
        position: 0,
        userId,
        createdAt: now,
        updatedAt: now,
      })
      result.notesImported++
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Conversion failed"
    result.errors.push(message)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }

  return result
}

function deriveFolderName(filename: string): string {
  const dotIndex = filename.lastIndexOf(".")
  const withoutExt = dotIndex > 0 ? filename.slice(0, dotIndex) : filename
  const underscoreIndex = withoutExt.indexOf("_")
  if (underscoreIndex > 0) {
    return withoutExt.slice(0, underscoreIndex)
  }
  return withoutExt
}

export function extractPageTitle(html: string): string {
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i)
  if (titleMatch) return titleMatch[1].trim()
  const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i)
  if (h1Match) return h1Match[1].trim()
  return ""
}

async function processImages(
  html: string,
  bucket: NonNullable<Awaited<ReturnType<typeof getBucket>>>,
  userId: string
): Promise<{ cleanedHtml: string; imageCount: number }> {
  let imageCount = 0
  const replacements: { start: number; end: number; newSrc: string }[] = []

  const dataUriRegex = /<img[^>]+src="data:image\/([a-z]+);base64,([^"]+)"[^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = dataUriRegex.exec(html)) !== null) {
    const fullMatch = match[0]
    const ext = match[1]
    const base64Data = match[2]
    const uploadId = new ObjectId()

    await new Promise<void>((resolve, reject) => {
      const uploadStream = bucket.openUploadStreamWithId(
        uploadId,
        `image-${uploadId.toHexString()}.${ext}`,
        {
          contentType: `image/${ext === "svg" ? "svg+xml" : ext}`,
          metadata: { userId, uploadedAt: new Date() },
        }
      )
      uploadStream.end(Buffer.from(base64Data, "base64"))
      uploadStream.on("finish", () => resolve())
      uploadStream.on("error", reject)
    })

    imageCount++
    replacements.push({
      start: match.index,
      end: match.index + fullMatch.length,
      newSrc: `/api/images/${uploadId.toHexString()}`,
    })
  }

  let cleanedHtml = html
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, newSrc } = replacements[i]
    const originalTag = cleanedHtml.slice(start, end)
    const updatedTag = originalTag.replace(/src="[^"]+"/, `src="${newSrc}"`)
    cleanedHtml = cleanedHtml.slice(0, start) + updatedTag + cleanedHtml.slice(end)
  }

  return { cleanedHtml, imageCount }
}

async function processSvgNodes(
  html: string,
  bucket: NonNullable<Awaited<ReturnType<typeof getBucket>>>,
  userId: string,
  result: OneNoteImportResult
): Promise<string> {
  const svgRegex = /<svg[^>]*>[\s\S]*?<\/svg>/gi
  const parts: string[] = []
  let lastIndex = 0
  let svgIndex = 0

  let match: RegExpExecArray | null
  while ((match = svgRegex.exec(html)) !== null) {
    parts.push(html.slice(lastIndex, match.index))
    const svgContent = match[0]
    svgIndex++
    const uploadId = new ObjectId()

    await new Promise<void>((resolve, reject) => {
      const uploadStream = bucket.openUploadStreamWithId(uploadId, `drawing-${svgIndex}.svg`, {
        contentType: "image/svg+xml",
        metadata: { userId, uploadedAt: new Date() },
      })
      uploadStream.end(Buffer.from(svgContent, "utf-8"))
      uploadStream.on("finish", () => resolve())
      uploadStream.on("error", reject)
    })

    result.imagesImported++
    parts.push(`<img src="/api/images/${uploadId.toHexString()}" alt="Drawing" />`)
    lastIndex = match.index + match[0].length
  }

  parts.push(html.slice(lastIndex))
  return parts.join("")
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/onenote/import.ts
git commit -m "feat: add OneNote import pipeline"
```

---

### Task 3: Create the API route

**Files:**
- Create: `src/app/api/notes/import/onenote/route.ts`

- [ ] **Step 1: Write the route handler**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { importOneNote } from "@/lib/onenote/import"

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

  const ext = file.name.toLowerCase().split(".").pop()
  if (ext !== "onepkg" && ext !== "one") {
    return NextResponse.json(
      { success: false, error: "Unsupported file format. Accepted: .onepkg, .one" },
      { status: 400 }
    )
  }

  const MAX_SIZE = 50 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { success: false, error: "File too large (max 50MB)" },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const db = await connectToDatabase()

  try {
    const result = await importOneNote(buffer, session.user.id as string, db)
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/notes/import/onenote/route.ts
git commit -m "feat: add OneNote import API route"
```

---

### Task 4: Update the UI

**Files:**
- Modify: `src/components/ImportExportSheet.tsx`

- [ ] **Step 1: Add OneNote import state and handler**

After `const fileInputRef = useRef<HTMLInputElement>(null)` (line 18), add:
```typescript
const [onenoteImportState, setOnenoteImportState] = useState<ImportState>("idle")
const [onenoteImportMessage, setOnenoteImportMessage] = useState("")
const onenoteFileInputRef = useRef<HTMLInputElement>(null)
```

After the `handleFileSelect` function (before line 97), add:
```typescript
async function handleOneNoteFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return

  const ext = file.name.toLowerCase().split(".").pop()
  if (ext !== "onepkg" && ext !== "one") {
    setOnenoteImportState("error")
    setOnenoteImportMessage("Unsupported file format. Accepted: .onepkg, .one")
    return
  }

  setOnenoteImportState("loading")
  setOnenoteImportMessage("")

  const formData = new FormData()
  formData.append("file", file)

  try {
    const res = await fetch("/api/notes/import/onenote", {
      method: "POST",
      body: formData,
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setOnenoteImportState("error")
      setOnenoteImportMessage(data.error || "Import failed")
      return
    }
    const r = data.data
    setOnenoteImportState("success")
    setOnenoteImportMessage(
      `Imported ${r.foldersCreated} folder${r.foldersCreated !== 1 ? "s" : ""}, ` +
        `${r.notesImported} note${r.notesImported !== 1 ? "s" : ""}, ` +
        `${r.imagesImported} image${r.imagesImported !== 1 ? "s" : ""}.`
    )
  } catch {
    setOnenoteImportState("error")
    setOnenoteImportMessage("Network error. Please try again.")
  }
}
```

- [ ] **Step 2: Add reset logic in the existing `useEffect`**

In the `useEffect` that resets on close (line 29-35), add after `setImportMessage("")`:
```typescript
setOnenoteImportState("idle")
setOnenoteImportMessage("")
```

- [ ] **Step 3: Add the OneNote import JSX section**

After the Import section's closing `</div>` (currently line 191, after the error state), add:
```tsx
{/* OneNote Import */}
<div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
  <div className="flex items-center gap-2 mb-2">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Import from OneNote</h3>
  </div>
  <p className="text-xs text-gray-500 mb-3">
    Import a OneNote notebook (.onepkg) or section (.one). Folders and notes will be created automatically.
  </p>
  <button
    onClick={() => onenoteFileInputRef.current?.click()}
    disabled={onenoteImportState === "loading"}
    className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
  >
    {onenoteImportState === "loading" ? (
      <>
        <Loader2 size={14} className="animate-spin" />
        Importing…
      </>
    ) : (
      "Select File"
    )}
  </button>
  <input
    ref={onenoteFileInputRef}
    type="file"
    accept=".onepkg,.one"
    className="hidden"
    onChange={handleOneNoteFileSelect}
  />
  <div className="mt-2 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    <span>Best compatibility with <strong>OneNote 2016+ on Windows</strong>. Older versions and Mac exports may not work.</span>
  </div>
  {onenoteImportState === "success" && (
    <div className="mt-3 flex items-start gap-2 text-xs text-green-600 dark:text-green-400">
      <CheckCircle size={14} className="mt-0.5 shrink-0" />
      <span>{onenoteImportMessage}</span>
    </div>
  )}
  {onenoteImportState === "error" && (
    <div className="mt-3 flex items-start gap-2 text-xs text-red-500">
      <AlertCircle size={14} className="mt-0.5 shrink-0" />
      <span>{onenoteImportMessage}</span>
    </div>
  )}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ImportExportSheet.tsx
git commit -m "feat: add OneNote import UI to ImportExportSheet"
```

---

### Task 5: Write tests

**Files:**
- Create: `src/__tests__/onenote-import.test.ts`

- [ ] **Step 1: Write format detection and helper tests**

```typescript
import { describe, it, expect } from "vitest"
import { detectOneNoteFormat, extractPageTitle } from "@/lib/onenote/import"

describe("detectOneNoteFormat", () => {
  it("detects .one files by magic bytes", () => {
    const magic = Buffer.from([
      0xE4, 0x52, 0x5C, 0x7B, 0x8C, 0xD8, 0xA7, 0x4D,
      0xAE, 0xB1, 0x53, 0x78, 0xD0, 0x29, 0x96, 0xD3,
    ])
    const buffer = Buffer.concat([magic, Buffer.from("more data")])
    expect(detectOneNoteFormat(buffer)).toBe("one")
  })

  it("detects .onepkg files by CAB header", () => {
    const buffer = Buffer.from("MSCFsomecabinetdata")
    expect(detectOneNoteFormat(buffer)).toBe("onepkg")
  })

  it("returns null for unknown formats", () => {
    expect(detectOneNoteFormat(Buffer.from("PK\x03\x04"))).toBeNull()
    expect(detectOneNoteFormat(Buffer.from("not a known format"))).toBeNull()
  })

  it("returns null for empty buffer", () => {
    expect(detectOneNoteFormat(Buffer.alloc(0))).toBeNull()
  })

  it("returns null for small buffer", () => {
    expect(detectOneNoteFormat(Buffer.from("small"))).toBeNull()
  })
})

describe("extractPageTitle", () => {
  it("extracts title from <title> tag", () => {
    const html = "<html><head><title>My Page</title></head><body></body></html>"
    expect(extractPageTitle(html)).toBe("My Page")
  })

  it("extracts title from first <h1> when no <title>", () => {
    const html = "<html><body><h1>Page Title</h1><p>content</p></body></html>"
    expect(extractPageTitle(html)).toBe("Page Title")
  })

  it("returns empty string when no title found", () => {
    const html = "<html><body><p>no title here</p></body></html>"
    expect(extractPageTitle(html)).toBe("")
  })

  it("trims whitespace from title", () => {
    const html = "<html><head><title>  Spaced Title  </title></head></html>"
    expect(extractPageTitle(html)).toBe("Spaced Title")
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/__tests__/onenote-import.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/onenote-import.test.ts
git commit -m "test: add OneNote import format detection tests"
```

---

### Task 6: End-to-end verification

- [ ] **Step 1: Build the project**

```bash
npm run build
```

Expected: No TypeScript errors. If `require('./vendor/renderer.js')` causes webpack issues, the error will appear here. If it fails, add a Next.js webpack config in `next.config.ts` to treat `.wasm` files as external:

If needed, in `next.config.ts`:
```typescript
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.experiments = { ...config.experiments, asyncWebAssembly: true }
      config.module.rules.push({
        test: /\.wasm$/,
        type: "asset/resource",
      })
    }
    return config
  },
}
```

If WASM loading still fails, switch to Node.js native loading in `convert.ts`:
```typescript
import fs from "fs"
import path from "path"

let converter: ((input: string, output: string, basePath: string) => void) | null = null

export async function convertOneNote(
  inputPath: string,
  outputDir: string,
  basePath: string
): Promise<void> {
  if (!converter) {
    const wasmPath = path.join(
      process.cwd(),
      "src/lib/onenote/vendor/renderer_bg.wasm"
    )
    const wasmBuffer = fs.readFileSync(wasmPath)
    const module = new WebAssembly.Module(wasmBuffer)
    const instance = new WebAssembly.Instance(module, {
      "./renderer_bg": { module },
    })
    converter = instance.exports.oneNoteConverter as any
  }
  converter(inputPath, outputDir, basePath)
}
```

- [ ] **Step 2: Start dev server and test UI**

```bash
npm run dev
```

Open http://localhost:3000, log in, open Import/Export sheet, verify the OneNote import section renders correctly with the purple "Select File" button.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass (existing + new).

- [ ] **Step 4: Clean up the `/import-visual` mockup page**

Remove the temporary mockup:
```bash
git rm -r src/app/import-visual/
```

Also revert the middleware change that exposed `/import-visual` (in `src/middleware.ts`).

Commit:
```bash
git add -A
git commit -m "chore: remove temporary import-visual mockup"
```
