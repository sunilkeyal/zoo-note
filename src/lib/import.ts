import * as yaml from "js-yaml"

export interface ParsedNote {
  title: string
  folder?: string
  content: string
}

export interface ProcessedFile {
  originalFilename: string
  notes: ParsedNote[]
  error?: string
}

const FRONT_MATTER_REGEX = /^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/

export function parseMarkdownFile(content: string): ParsedNote {
  const match = content.match(FRONT_MATTER_REGEX)
  if (!match) {
    return { title: "", content }
  }

  const frontMatterRaw = match[1]
  const body = match[2].trimStart()

  let frontMatter: Record<string, unknown> = {}
  try {
    frontMatter = yaml.load(frontMatterRaw) as Record<string, unknown>
  } catch {
    return { title: "", content }
  }

  return {
    title: (frontMatter.title as string) || "",
    folder: frontMatter.folder as string | undefined,
    content: body,
  }
}

export async function processImportFile(
  buffer: Buffer,
  filename: string
): Promise<ProcessedFile> {
  const lower = filename.toLowerCase()

  if (lower.endsWith(".md")) {
    const parsed = parseMarkdownFile(buffer.toString("utf-8"))
    return {
      originalFilename: filename,
      notes: [parsed],
    }
  }

  if (lower.endsWith(".zip")) {
    const { default: AdmZip } = await import("adm-zip")
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries()
    const notes: ParsedNote[] = []

    for (const entry of entries) {
      if (!entry.entryName.toLowerCase().endsWith(".md") || entry.isDirectory) continue
      const content = entry.getData().toString("utf-8")
      const parsed = parseMarkdownFile(content)
      notes.push(parsed)
    }

    return { originalFilename: filename, notes }
  }

  return {
    originalFilename: filename,
    notes: [],
    error: `Unsupported file type: ${filename}`,
  }
}
