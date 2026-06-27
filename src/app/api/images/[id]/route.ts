import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getBucket } from '@/lib/gridfs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid image ID' }, { status: 400 })
  }

  const bucket = await getBucket()

  try {
    const files = await bucket.find({ _id: objectId }).toArray()
    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 })
    }
    const file = files[0]

    const downloadStream = bucket.openDownloadStream(objectId)
    const readable = new ReadableStream({
      start(controller) {
        downloadStream.on('data', (chunk) => controller.enqueue(chunk))
        downloadStream.on('end', () => controller.close())
        downloadStream.on('error', (err) => controller.error(err))
      },
    })

    return new NextResponse(readable, {
      status: 200,
      headers: {
        'Content-Type': file.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 })
  }
}
