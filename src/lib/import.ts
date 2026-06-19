import * as yaml from "js-yaml"

export interface ParsedNote {
  title: string
  folder?: string
  content: string
  sourceFilename?: string
}

export interface ProcessedFile {
  originalFilename: string
  notes: ParsedNote[]
  error?: string
}

const FRONT_MATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?\r?\n?([\s\S]*)$/

export function parseMarkdownFile(content: string): ParsedNote {
  const normalized = content.replace(/\r\n/g, "\n")
  const match = normalized.match(FRONT_MATTER_REGEX)
  if (!match) {
    return { title: "", content: normalized }
  }

  const frontMatterRaw = match[1]
  const body = match[2].trimStart()

  let frontMatter: Record<string, unknown> = {}
  try {
    const parsed = yaml.load(frontMatterRaw)
    frontMatter = (parsed ?? {}) as Record<string, unknown>
  } catch {
    return { title: "", content: normalized }
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
    const parsed = parseMarkdownFile(buffer.toString())
    parsed.sourceFilename = filename
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
      const content = entry.getData().toString()
      const parsed = parseMarkdownFile(content)
      parsed.sourceFilename = entry.entryName
      notes.push(parsed)
    }

    const result: ProcessedFile = { originalFilename: filename, notes }
    if (notes.length === 0 && entries.length > 0) {
      result.error = "No markdown files found in archive"
    }
    return result
  }

  return {
    originalFilename: filename,
    notes: [],
    error: `Unsupported file type: ${filename}`,
  }
}
