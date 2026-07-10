import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { saveImage, deleteImageById } from '@/lib/gridfs'
import { compressImage } from '@/lib/image-compress'
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

  let compressed: Buffer
  try {
    compressed = await compressImage(buffer)
  } catch {
    return NextResponse.json({ success: false, error: 'Image processing failed' }, { status: 500 })
  }

  const db = await connectToDatabase()
  const uploadId = new ObjectId()
  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${uploadId.toHexString()}.${ext}`

  await saveImage(db, uploadId, filename, file.type || 'image/jpeg', compressed, {
    userId: session.user.id!,
    originalName: file.name,
    uploadedAt: new Date(),
  })

  // Lazy-cleanup: remove unreferenced images older than 1 hour
  const oneHourAgo = new Date(Date.now() - 3600000)
  const oldOrphans = await db.collection("images").find({
    "metadata.userId": session.user.id,
    uploadDate: { $lt: oneHourAgo },
  }).toArray()
  for (const img of oldOrphans) {
    const refCount = await db.collection("notes").countDocuments({
      userId: session.user.id,
      content: { $regex: img._id.toString() },
    })
    if (refCount === 0) {
      await deleteImageById(db, img._id)
    }
  }

  return NextResponse.json({
    success: true,
    data: { id: uploadId.toHexString(), url: `/api/images/${uploadId.toHexString()}` },
  }, { status: 201 })
}
