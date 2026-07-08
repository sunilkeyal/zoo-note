import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/onenote/convert", () => ({
  convertOneNote: vi.fn(),
}))

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
