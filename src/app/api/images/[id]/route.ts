import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { connectToDatabase } from '@/lib/mongodb'
import { getImageById } from '@/lib/gridfs'
import { auth } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Images are private — require authentication
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid image ID' }, { status: 400 })
  }

  const db = await connectToDatabase()

  try {
    const img = await getImageById(db, objectId)
    if (!img) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 })
    }

    // Ownership check — only the uploader may view the image
    if (img.metadata.userId && img.metadata.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    return new NextResponse(new Uint8Array(img.data), {
      status: 200,
      headers: {
        'Content-Type': img.contentType || 'image/jpeg',
        // private: browsers may cache but CDNs/proxies must not
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 })
  }
}
