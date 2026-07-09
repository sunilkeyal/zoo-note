import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { createRequire } from "node:module"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
process.env.ONENOTE_VENDOR_DIR = join(__dirname, "vendor")

const require = createRequire(import.meta.url)

let _converter: ((input: string, output: string, base: string) => void) | null =
  null

function getConverter(): (input: string, output: string, base: string) => void {
  if (!_converter) {
    const mod = require("./vendor/renderer.js")
    _converter = mod.oneNoteConverter
  }
  return _converter!
}

export function convertOneNote(
  inputPath: string,
  outputDir: string,
  basePath: string
): void {
  try {
    getConverter()(inputPath, outputDir, basePath)
  } catch (err) {
    throw new Error(
      `OneNote conversion failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
