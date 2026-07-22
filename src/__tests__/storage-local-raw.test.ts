import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import * as os from "os"
import * as path from "path"
import * as fs from "fs/promises"

// ── helpers to resolve the same paths that storage.ts uses ──────────────────

const BASE = path.join(os.tmpdir(), "zoo-note-imports")

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

// ── module setup ─────────────────────────────────────────────────────────────

// Ensure STORAGE_PROVIDER=local so the local branches are used.
vi.stubEnv("STORAGE_PROVIDER", "local")

// Re-import after env stub so the module picks up the stub value.
const { storageSaveRaw, storageReadRaw, deleteByPrefix } = await import("@/lib/storage")

describe("local raw import artefact storage", () => {
  const testPrefix = `test-job-${Date.now()}`
  const key = `imports/${testPrefix}/source.onepkg`
  const payload = Buffer.from("binary-content-abc")

  afterEach(async () => {
    // Clean up any files written during the test
    await deleteByPrefix(`imports/${testPrefix}`)
  })

  // ── storageSaveRaw / storageReadRaw ────────────────────────────────────────

  it("saves to os.tmpdir(), not public/uploads/", async () => {
    await storageSaveRaw(key, payload, "application/octet-stream")
    const expectedPath = path.join(BASE, key)
    expect(await exists(expectedPath)).toBe(true)
  })

  it("round-trips: read returns same bytes that were written", async () => {
    await storageSaveRaw(key, payload, "application/octet-stream")
    const result = await storageReadRaw(key)
    expect(result).not.toBeNull()
    expect(result!.equals(payload)).toBe(true)
  })

  it("storageReadRaw returns null for a missing key", async () => {
    const result = await storageReadRaw(`imports/${testPrefix}/nonexistent.bin`)
    expect(result).toBeNull()
  })

  it("creates intermediate directories automatically", async () => {
    const deepKey = `imports/${testPrefix}/converted/SectionA/page1.html`
    await storageSaveRaw(deepKey, Buffer.from("<html/>"), "text/html")
    const result = await storageReadRaw(deepKey)
    expect(result?.toString()).toBe("<html/>")
  })

  // ── deleteByPrefix (success path — FR-003) ─────────────────────────────────

  it("deleteByPrefix removes all files under the prefix after successful import", async () => {
    const htmlKey = `imports/${testPrefix}/converted/page1.html`
    await storageSaveRaw(key, payload, "application/octet-stream")
    await storageSaveRaw(htmlKey, Buffer.from("<html/>"), "text/html")

    await deleteByPrefix(`imports/${testPrefix}`)

    expect(await exists(path.join(BASE, `imports/${testPrefix}`))).toBe(false)
  })

  it("deleteByPrefix is idempotent — no error when prefix is already absent", async () => {
    await expect(deleteByPrefix(`imports/${testPrefix}-never-created`)).resolves.not.toThrow()
  })

  // ── deleteByPrefix (failure path — FR-004) ─────────────────────────────────

  it("deleteByPrefix removes temp files even when called on a failed import job", async () => {
    // Simulate: files written during conversion, then job transitions to "failed".
    await storageSaveRaw(key, payload, "application/octet-stream")
    await storageSaveRaw(
      `imports/${testPrefix}/converted/SectionA/page1.html`,
      Buffer.from("<html/>"),
      "text/html"
    )

    // cleanupImportData calls deleteByPrefix when a job fails —
    // calling it directly here confirms FR-004: temp files are removed on failure.
    await deleteByPrefix(`imports/${testPrefix}`)

    expect(await exists(path.join(BASE, `imports/${testPrefix}`))).toBe(false)
  })
})
