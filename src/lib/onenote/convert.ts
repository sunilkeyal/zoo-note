import { oneNoteConverter } from "./vendor/renderer.js"

export function convertOneNote(
  inputPath: string,
  outputDir: string,
  basePath: string
): void {
  try {
    oneNoteConverter(inputPath, outputDir, basePath)
  } catch (err) {
    throw new Error(
      `OneNote conversion failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
