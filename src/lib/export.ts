import TurndownService from "turndown"
import { Note, Folder } from "@/types"
import * as yaml from "js-yaml"
import * as archiver from "archiver"

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
})

export function convertHtmlToMarkdown(html: string): string {
  return turndown.turndown(html || "")
}

export function generateFrontMatter(title: string, folderName?: string): string {
  const data: Record<string, string> = { title }
  if (folderName) {
    data.folder = folderName
  }
  return "---\n" + yaml.dump(data) + "---\n\n"
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_").trim() || "untitled"
}

export async function generateExportZip(
  notes: Note[],
  folders: Folder[]
): Promise<Buffer> {
  const folderMap = new Map(folders.map((f) => [f._id, f.name]))

  return new Promise((resolve, reject) => {
    const archive = new archiver.ZipArchive({ zlib: { level: 9 } })
    const chunks: Buffer[] = []

    archive.on("data", (chunk: Buffer) => chunks.push(chunk))
    archive.on("end", () => resolve(Buffer.concat(chunks)))
    archive.on("error", reject)

    const usedFilenames = new Set<string>()

    for (const note of notes) {
      const folderName = note.folderId ? folderMap.get(note.folderId) : undefined
      const frontMatter = generateFrontMatter(note.title, folderName)
      const markdownBody = convertHtmlToMarkdown(note.content)
      const content = frontMatter + markdownBody

      const sanitizedTitle = sanitizeFilename(note.title)
      const baseName = folderName
        ? `${sanitizeFilename(folderName)}/${sanitizedTitle}.md`
        : `${sanitizedTitle}.md`

      let filename = baseName
      let counter = 1
      while (usedFilenames.has(filename)) {
        filename = folderName
          ? `${sanitizeFilename(folderName)}/${sanitizedTitle}-${counter}.md`
          : `${sanitizedTitle}-${counter}.md`
        counter++
      }
      usedFilenames.add(filename)

      archive.append(content, { name: filename })
    }

    archive.finalize()
  })
}
