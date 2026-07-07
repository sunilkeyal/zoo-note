import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  return doc.body.textContent?.trim() ?? ""
}

const IMAGE_SRC_REGEX = /src="\/api\/images\/([a-f0-9]{24})"/gi

export function extractImageIds(html: string): string[] {
  const ids = new Set<string>()
  let match
  while ((match = IMAGE_SRC_REGEX.exec(html)) !== null) {
    ids.add(match[1])
  }
  return Array.from(ids)
}

export function rewriteImageSrcs(
  html: string,
  fromPrefix: string,
  toPrefix: string
): string {
  return html.replace(
    /src="([^"]*)"/g,
    (_, src) => {
      if (src.startsWith(fromPrefix)) {
        return `src="${src.replace(fromPrefix, toPrefix)}"`
      }
      return `src="${src}"`
    }
  )
}
