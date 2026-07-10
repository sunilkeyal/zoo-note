import sharp from 'sharp'

const DEFAULT_MAX_BYTES = 100 * 1024
const DEFAULT_MAX_WIDTH = 1200

export async function compressImage(
  buffer: Buffer,
  maxBytes: number = DEFAULT_MAX_BYTES,
  maxWidth: number = DEFAULT_MAX_WIDTH
): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata()
  const width = metadata.width || maxWidth
  const pipeline = sharp(buffer)
    .resize(Math.min(width, maxWidth), undefined, { fit: 'inside', withoutEnlargement: true })
    .jpeg()

  let lo = 1, hi = 100
  let best: Buffer | null = null
  let bestSize = Infinity

  for (let i = 0; i < 15; i++) {
    if (lo > hi) break
    const mid = Math.round((lo + hi) / 2)
    if (mid < 1 || mid > 100) break
    const buf = await pipeline.clone().jpeg({ quality: mid }).toBuffer()
    const size = buf.length
    if (size <= maxBytes && (maxBytes - size) < (maxBytes - bestSize)) {
      best = buf
      bestSize = size
    }
    if (Math.abs(size - maxBytes) < maxBytes * 0.15) { best = buf; break }
    if (size > maxBytes) hi = mid - 1
    else lo = mid + 1
  }

  if (!best) best = await pipeline.jpeg({ quality: 15 }).toBuffer()
  return best
}
