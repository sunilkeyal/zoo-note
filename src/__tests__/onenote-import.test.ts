import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/onenote/convert", () => ({
  convertOneNote: vi.fn(),
}))

import { detectOneNoteFormat, extractPageTitle, replaceLocalImageRefs, extractBodyContent, parsePageOrderFromToc, stripFontStyles } from "@/lib/onenote/import"

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

describe("replaceLocalImageRefs", () => {
  it("replaces local file src with GridFS URL", () => {
    const html = '<img src="image_abc123.png" />'
    const map = new Map([["image_abc123.png", "/api/files/abc123"]])
    const { cleanedHtml, imageCount } = replaceLocalImageRefs(html, map)
    expect(cleanedHtml).toBe('<img src="/api/files/abc123" />')
    expect(imageCount).toBe(1)
  })

  it("ignores absolute URLs", () => {
    const html = '<img src="https://example.com/image.png" />'
    const map = new Map([["image.png", "/api/files/abc123"]])
    const { cleanedHtml, imageCount } = replaceLocalImageRefs(html, map)
    expect(cleanedHtml).toBe(html)
    expect(imageCount).toBe(0)
  })

  it("ignores data URIs", () => {
    const html = '<img src="data:image/png;base64,iVBORw0KGgo=" />'
    const map = new Map([["image.png", "/api/files/abc123"]])
    const { cleanedHtml, imageCount } = replaceLocalImageRefs(html, map)
    expect(cleanedHtml).toBe(html)
    expect(imageCount).toBe(0)
  })

  it("ignores protocol-relative URLs", () => {
    const html = '<img src="//cdn.example.com/photo.jpg" />'
    const map = new Map([["photo.jpg", "/api/files/abc123"]])
    const { cleanedHtml, imageCount } = replaceLocalImageRefs(html, map)
    expect(cleanedHtml).toBe(html)
    expect(imageCount).toBe(0)
  })

  it("handles src with relative path prefix", () => {
    const html = '<img src="./images/photo.png" />'
    const map = new Map([["photo.png", "/api/files/xyz789"]])
    const { cleanedHtml, imageCount } = replaceLocalImageRefs(html, map)
    expect(cleanedHtml).toBe('<img src="/api/files/xyz789" />')
    expect(imageCount).toBe(1)
  })

  it("replaces multiple images in one HTML", () => {
    const html = '<img src="a.png" /><p>text</p><img src="b.jpg" />'
    const map = new Map([
      ["a.png", "/api/files/aaa"],
      ["b.jpg", "/api/files/bbb"],
    ])
    const { cleanedHtml, imageCount } = replaceLocalImageRefs(html, map)
    expect(cleanedHtml).toBe('<img src="/api/files/aaa" /><p>text</p><img src="/api/files/bbb" />')
    expect(imageCount).toBe(2)
  })

  it("leaves unknown filenames unchanged", () => {
    const html = '<img src="unknown.png" />'
    const map = new Map([["known.png", "/api/files/abc123"]])
    const { cleanedHtml, imageCount } = replaceLocalImageRefs(html, map)
    expect(cleanedHtml).toBe(html)
    expect(imageCount).toBe(0)
  })

  it("handles empty map", () => {
    const html = '<img src="image.png" />'
    const map = new Map()
    const { cleanedHtml, imageCount } = replaceLocalImageRefs(html, map)
    expect(cleanedHtml).toBe(html)
    expect(imageCount).toBe(0)
  })
})

describe("extractBodyContent", () => {
  it("extracts content between <body> tags", () => {
    const html = "<html><head><title>T</title></head><body><p>Hello</p></body></html>"
    expect(extractBodyContent(html)).toBe("<p>Hello</p>")
  })

  it("strips <script> tags from body", () => {
    const html = "<html><body><p>Content</p><script>alert('x')</script></body></html>"
    expect(extractBodyContent(html)).toBe("<p>Content</p>")
  })

  it("strips DOCTYPE, html, head when no <body> tag", () => {
    const html = "<!DOCTYPE html><html><head><title>T</title></head><p>Fragment</p></html>"
    expect(extractBodyContent(html)).toBe("<p>Fragment</p>")
  })

  it("strips <div class=\"title\"> block containing title and timestamp", () => {
    const html = '<html><body><div class="title" style="left:48px"><div class="container-outline"><div class="outline-element"><span>My Title</span></div></div><div class="container-outline"><div class="outline-element"><span>Friday, Jan 1, 2024</span></div></div></div><p>Content</p></body></html>'
    expect(extractBodyContent(html)).toBe("<p>Content</p>")
  })

  it("strips script tags even when no body tags", () => {
    const html = "<p>Content</p><script>bad()</script>"
    expect(extractBodyContent(html)).toBe("<p>Content</p>")
  })

  it("handles body with attributes", () => {
    const html = '<html><body class="onenote"><p>Test</p></body></html>'
    expect(extractBodyContent(html)).toBe("<p>Test</p>")
  })

  it("does not strip content when no title div", () => {
    const html = "<html><body><p>Content</p></body></html>"
    expect(extractBodyContent(html)).toBe("<p>Content</p>")
  })

  it("strips only the title div, not following content divs", () => {
    const html = '<html><body><div class="title"><div><span>Title</span></div></div><div class="container-outline"><div><p>Body</p></div></div></body></html>'
    expect(extractBodyContent(html)).toBe('<div class="container-outline"><div><p>Body</p></div></div>')
  })
})

describe("parsePageOrderFromToc", () => {
  it("extracts page filenames from nav links in ToC order", () => {
    const toc = `<html><body><nav><ul>
      <li class="l1"><a href="%5CInformation%5CFood.html" target="content" title="Food">Food</a></li>
      <li class="l1"><a href="%5CInformation%5CLibrary%20Card.html" target="content" title="Library Card">Library Card</a></li>
      <li class="l1"><a href="%5CInformation%5CBird%20Food.html" target="content" title="Bird Food">Bird Food</a></li>
      <li class="l1"><a href="%5CInformation%5CZoo%20Map.html" target="content" title="Zoo Map">Zoo Map</a></li>
    </ul></nav></body></html>`
    expect(parsePageOrderFromToc(toc)).toEqual([
      "Food.html",
      "Library Card.html",
      "Bird Food.html",
      "Zoo Map.html",
    ])
  })

  it("returns empty array for ToC with no links", () => {
    expect(parsePageOrderFromToc("<html></html>")).toEqual([])
  })

  it("handles non-encoded hrefs", () => {
    const toc = `<nav><ul><li><a href="Food.html">Food</a></li></ul></nav>`
    expect(parsePageOrderFromToc(toc)).toEqual(["Food.html"])
  })
})

describe("stripFontStyles", () => {
  it("removes font-family and font-size from paragraph style", () => {
    const html = '<p style="font-family: Calibri, sans-serif; font-size: 11pt;">text</p>'
    expect(stripFontStyles(html)).toBe("<p >text</p>")
  })

  it("removes font-family and font-size from span inside list item", () => {
    const html = '<li><span style="font-family: &quot;Calibri&quot;, sans-serif; font-size: 11pt;">text</span></li>'
    expect(stripFontStyles(html)).toBe("<li><span >text</span></li>")
  })

  it("removes font-family and font-size from heading", () => {
    const html = '<h1 style="color: rgb(30,78,121); font-family: Calibri; font-size: 16pt;">title</h1>'
    expect(stripFontStyles(html)).toBe('<h1 style="color: rgb(30,78,121)">title</h1>')
  })

  it("removes empty style attribute", () => {
    const html = '<p style="font-family: Calibri;">text</p>'
    expect(stripFontStyles(html)).toBe("<p >text</p>")
  })

  it("preserves elements without style", () => {
    const html = "<p>plain text</p>"
    expect(stripFontStyles(html)).toBe("<p>plain text</p>")
  })

  it("preserves non-font style properties", () => {
    const html = '<div style="margin-left: 36px;"><p>text</p></div>'
    expect(stripFontStyles(html)).toBe('<div style="margin-left: 36px"><p>text</p></div>')
  })
})
