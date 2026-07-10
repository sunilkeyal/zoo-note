import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDb = {
  collection: vi.fn(),
}

vi.mock('@/lib/mongodb', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

vi.mock('mongodb', () => ({
  ObjectId: class ObjectId {
    toHexString() { return 'abc123' }
    toString() { return 'abc123' }
  },
  Binary: class Binary {
    buffer: Buffer
    constructor(buf: Buffer) { this.buffer = buf }
  },
}))

describe('image utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('exports imageUrl helper', async () => {
    const { imageUrl } = await import('@/lib/gridfs')
    expect(typeof imageUrl).toBe('function')
    expect(imageUrl('abc123')).toBe('/api/images/abc123')
  })

  it('saveImage inserts into images collection', async () => {
    const mockInsert = vi.fn()
    mockDb.collection.mockReturnValue({ insertOne: mockInsert })

    const { saveImage } = await import('@/lib/gridfs')
    const { ObjectId, Binary } = await import('mongodb')
    const id = new ObjectId()
    await saveImage(mockDb, id, 'test.jpg', 'image/jpeg', Buffer.from('data'), {
      userId: 'u1', originalName: 'test.jpg', uploadedAt: new Date(),
    })

    expect(mockDb.collection).toHaveBeenCalledWith('images')
    expect(mockInsert).toHaveBeenCalledOnce()
    const doc = mockInsert.mock.calls[0][0]
    expect(doc._id).toBe(id)
    expect(doc.filename).toBe('test.jpg')
    expect(doc.contentType).toBe('image/jpeg')
    expect(doc.length).toBe(4)
    expect(doc.metadata.userId).toBe('u1')
  })

  it('getImageById returns null when not found', async () => {
    mockDb.collection.mockReturnValue({ findOne: vi.fn().mockResolvedValue(null) })

    const { getImageById } = await import('@/lib/gridfs')
    const { ObjectId } = await import('mongodb')
    const result = await getImageById(mockDb, new ObjectId())

    expect(result).toBeNull()
  })

  it('getImageById returns image data when found', async () => {
    const mockDoc = {
      contentType: 'image/png',
      data: { buffer: Buffer.from('img-data') },
      length: 8,
      filename: 'photo.png',
      metadata: { userId: 'u1' },
    }
    mockDb.collection.mockReturnValue({ findOne: vi.fn().mockResolvedValue(mockDoc) })

    const { getImageById } = await import('@/lib/gridfs')
    const { ObjectId } = await import('mongodb')
    const result = await getImageById(mockDb, new ObjectId())

    expect(result).toEqual({
      contentType: 'image/png',
      data: Buffer.from('img-data'),
      length: 8,
      filename: 'photo.png',
      metadata: { userId: 'u1' },
    })
  })

  it('deleteImageById deletes from images collection', async () => {
    mockDb.collection.mockReturnValue({ deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }) })

    const { deleteImageById } = await import('@/lib/gridfs')
    const { ObjectId } = await import('mongodb')
    const result = await deleteImageById(mockDb, new ObjectId())

    expect(result).toBe(true)
    expect(mockDb.collection).toHaveBeenCalledWith('images')
  })
})
