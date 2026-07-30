// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"
import AdmZip from "adm-zip"
import { ObjectId } from "mongodb"

const { mockSaveImage } = vi.hoisted(() => ({ mockSaveImage: vi.fn() }))

vi.mock("@/lib/gridfs", () => ({
  saveImage: mockSaveImage,
}))

import { importFromZip } from "@/lib/import"

interface Manifest {
  version: number
  exportedAt: string
  folders: { name: string; position: number }[]
  notes: { title: string; content: string; folderName: string | null; position: number }[]
}

function buildZip(manifest: unknown, images: { name: string; data: Buffer }[] = []): Buffer {
  const zip = new AdmZip()
  if (manifest !== undefined) {
    zip.addFile("notes.json", Buffer.from(JSON.stringify(manifest), "utf-8"))
  }
  for (const img of images) {
    zip.addFile(img.name, img.data)
  }
  return zip.toBuffer()
}

function baseManifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    folders: [],
    notes: [],
    ...overrides,
  }
}

function makeDb() {
  const foldersInsertOne = vi.fn(async () => ({ insertedId: new ObjectId() }))
  const foldersFindOne = vi.fn(async () => null)
  const notesInsertOne = vi.fn(async () => ({ insertedId: new ObjectId() }))

  const foldersCol = { findOne: foldersFindOne, insertOne: foldersInsertOne }
  const notesCol = { insertOne: notesInsertOne }

  const collection = vi.fn((name: string) => {
    if (name === "folders") return foldersCol
    if (name === "notes") return notesCol
    return {}
  })

  return {
    db: { collection } as never,
    foldersFindOne,
    foldersInsertOne,
    notesInsertOne,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSaveImage.mockResolvedValue(undefined)
})

describe("importFromZip — validation", () => {
  it("throws on an invalid ZIP buffer", async () => {
    const { db } = makeDb()
    await expect(importFromZip(Buffer.from("not a zip"), "user1", db)).rejects.toThrow("Invalid ZIP file")
  })

  it("throws when notes.json is missing", async () => {
    const { db } = makeDb()
    const buf = buildZip(undefined, [{ name: "images/x.png", data: Buffer.from("x") }])
    await expect(importFromZip(buf, "user1", db)).rejects.toThrow("missing notes.json")
  })

  it("throws when notes.json is not valid JSON", async () => {
    const { db } = makeDb()
    const zip = new AdmZip()
    zip.addFile("notes.json", Buffer.from("{ not json", "utf-8"))
    await expect(importFromZip(zip.toBuffer(), "user1", db)).rejects.toThrow("not valid JSON")
  })

  it("throws on an unsupported export version", async () => {
    const { db } = makeDb()
    const buf = buildZip(baseManifest({ version: 2 }))
    await expect(importFromZip(buf, "user1", db)).rejects.toThrow("Unsupported export version: 2")
  })
})

describe("importFromZip — folders", () => {
  it("creates new folders that do not already exist", async () => {
    const { db, foldersInsertOne } = makeDb()
    const buf = buildZip(baseManifest({ folders: [{ name: "Work", position: 0 }] }))

    const result = await importFromZip(buf, "user1", db)

    expect(foldersInsertOne).toHaveBeenCalledTimes(1)
    expect(foldersInsertOne).toHaveBeenCalledWith(expect.objectContaining({ name: "Work", position: 0, userId: "user1" }))
    expect(result.foldersCreated).toBe(1)
  })

  it("reuses existing folders instead of creating duplicates", async () => {
    const { db, foldersFindOne, foldersInsertOne } = makeDb()
    foldersFindOne.mockResolvedValueOnce({ _id: new ObjectId() } as never)
    const buf = buildZip(baseManifest({ folders: [{ name: "Work", position: 0 }] }))

    const result = await importFromZip(buf, "user1", db)

    expect(foldersInsertOne).not.toHaveBeenCalled()
    expect(result.foldersCreated).toBe(0)
  })
})

describe("importFromZip — notes", () => {
  it("imports notes and maps folderName to the created folder id", async () => {
    const folderId = new ObjectId()
    const { db, foldersInsertOne, notesInsertOne } = makeDb()
    foldersInsertOne.mockResolvedValueOnce({ insertedId: folderId })
    const buf = buildZip(baseManifest({
      folders: [{ name: "Work", position: 0 }],
      notes: [{ title: "Note A", content: "<p>hi</p>", folderName: "Work", position: 0 }],
    }))

    const result = await importFromZip(buf, "user1", db)

    expect(result.notesImported).toBe(1)
    expect(notesInsertOne).toHaveBeenCalledWith(expect.objectContaining({
      title: "Note A",
      folderId: folderId.toString(),
      userId: "user1",
    }))
  })

  it("imports standalone notes with a null folderId", async () => {
    const { db, notesInsertOne } = makeDb()
    const buf = buildZip(baseManifest({
      notes: [{ title: "Loose", content: "", folderName: null, position: 0 }],
    }))

    await importFromZip(buf, "user1", db)

    expect(notesInsertOne).toHaveBeenCalledWith(expect.objectContaining({ title: "Loose", folderId: null }))
  })
})

describe("importFromZip — images", () => {
  it("saves images and rewrites note content references to API paths", async () => {
    const { db, notesInsertOne } = makeDb()
    const buf = buildZip(
      baseManifest({
        notes: [{ title: "WithImg", content: '<img src="images/pic.png">', folderName: null, position: 0 }],
      }),
      [{ name: "images/pic.png", data: Buffer.from("fakepng") }],
    )

    const result = await importFromZip(buf, "user1", db)

    expect(result.imagesImported).toBe(1)
    expect(mockSaveImage).toHaveBeenCalledTimes(1)
    const savedContent = notesInsertOne.mock.calls[0][0].content as string
    expect(savedContent).not.toContain('src="images/pic.png"')
    expect(savedContent).toMatch(/src="\/api\/images\/[a-f0-9]{24}"/)
  })

  it("rejects image entries with path traversal or absolute paths", async () => {
    const { db } = makeDb()
    const buf = buildZip(baseManifest(), [
      { name: "images/../evil.png", data: Buffer.from("x") },
      { name: "/etc/passwd", data: Buffer.from("x") },
    ])

    const result = await importFromZip(buf, "user1", db)

    expect(mockSaveImage).not.toHaveBeenCalled()
    expect(result.imagesImported).toBe(0)
  })
})

describe("importFromZip — error collection", () => {
  it("records an error and continues when a note insert fails", async () => {
    const { db, notesInsertOne } = makeDb()
    notesInsertOne.mockRejectedValueOnce(new Error("db down"))
    const buf = buildZip(baseManifest({
      notes: [
        { title: "Bad", content: "", folderName: null, position: 0 },
        { title: "Good", content: "", folderName: null, position: 1 },
      ],
    }))

    const result = await importFromZip(buf, "user1", db)

    expect(result.notesImported).toBe(1)
    expect(result.errors).toContain("Failed to create note: Bad")
  })
})
