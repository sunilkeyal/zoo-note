import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import sharp from 'sharp'
import { getBucket } from '@/lib/gridfs'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file || !file.type.startsWith('image/')) {
    return NextResponse.json({ success: false, error: 'Image file is required' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let compressed: Buffer | undefined
  try {
    const metadata = await sharp(buffer).metadata()
    const width = metadata.width || 1200
    const pipeline = sharp(buffer)
      .resize(Math.min(width, 1200), undefined, { fit: 'inside', withoutEnlargement: true })
      .jpeg()

    const maxBytes = 100 * 1024
    let lo = 1, hi = 100
    let bestSize = Infinity
    for (let i = 0; i < 15; i++) {
      if (lo > hi) break
      const mid = Math.round((lo + hi) / 2)
      if (mid < 1 || mid > 100) break
      const buf = await pipeline.clone().jpeg({ quality: mid }).toBuffer()
      const size = buf.length
      if (size <= maxBytes && (maxBytes - size) < (maxBytes - bestSize)) {
        compressed = buf
        bestSize = size
      }
      if (Math.abs(size - maxBytes) < maxBytes * 0.15) { compressed = buf; break }
      if (size > maxBytes) hi = mid - 1
      else lo = mid + 1
    }
    if (!compressed) compressed = await pipeline.jpeg({ quality: 15 }).toBuffer()
  } catch {
    return NextResponse.json({ success: false, error: 'Image processing failed' }, { status: 500 })
  }

  const bucket = await getBucket()
  const uploadId = new ObjectId()
  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${uploadId.toHexString()}.${ext}`

  await new Promise<void>((resolve, reject) => {
    const uploadStream = bucket.openUploadStreamWithId(uploadId, filename, {
      contentType: file.type || 'image/jpeg',
      metadata: {
        userId: session.user!.id,
        originalName: file.name,
        uploadedAt: new Date(),
      },
    })
    uploadStream.end(compressed)
    uploadStream.on('finish', () => resolve())
    uploadStream.on('error', reject)
  })

  return NextResponse.json({
    success: true,
    data: { id: uploadId.toHexString(), url: `/api/images/${uploadId.toHexString()}` },
  }, { status: 201 })
}
