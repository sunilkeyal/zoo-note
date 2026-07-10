import sharp from 'sharp'

const MAX_BYTES = 50 * 1024
const MAX_WIDTHS = [1200, 800, 600, 400, 200]

export async function compressImage(buffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata()
  const originalWidth = metadata.width || MAX_WIDTHS[0]

  for (const maxWidth of MAX_WIDTHS) {
    const targetWidth = Math.min(originalWidth, maxWidth)
    const pipeline = sharp(buffer)
      .resize(targetWidth, undefined, { fit: 'inside', withoutEnlargement: true })
      .jpeg()

    let lo = 1, hi = 100
    let best: Buffer | null = null
    let bestSize = 0

    for (let i = 0; i < 15; i++) {
      if (lo > hi) break
      const mid = Math.round((lo + hi) / 2)
      const buf = await pipeline.clone().jpeg({ quality: mid }).toBuffer()
      const size = buf.length
      if (size <= MAX_BYTES && size > bestSize) {
        best = buf
        bestSize = size
      }
      if (size > MAX_BYTES) hi = mid - 1
      else lo = mid + 1
    }

    if (best) return best
  }

  const buf = await sharp(buffer)
    .resize(200, undefined, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 1 })
    .toBuffer()
  return buf
}
