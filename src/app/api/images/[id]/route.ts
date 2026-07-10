import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { connectToDatabase } from '@/lib/mongodb'
import { getImageById } from '@/lib/gridfs'
import { isR2, storagePublicUrl } from '@/lib/storage'

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

  // R2: redirect to the public CDN URL — no database lookup needed
  if (isR2()) {
    const url = storagePublicUrl(id)
    if (!url.startsWith('http')) {
      return NextResponse.json(
        { success: false, error: 'R2_PUBLIC_URL env var is not configured' },
        { status: 500 }
      )
    }
    return NextResponse.redirect(url, { status: 302 })
  }

  const db = await connectToDatabase()

  try {
    const img = await getImageById(db, objectId)
    if (!img) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(img.data), {
      status: 200,
      headers: {
        'Content-Type': img.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 })
  }
}
