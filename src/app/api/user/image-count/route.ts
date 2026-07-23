import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const db = await connectToDatabase()
  const count = await db.collection('images').countDocuments({
    'metadata.userId': session.user.id,
  })

  return NextResponse.json({ success: true, data: { count } })
}