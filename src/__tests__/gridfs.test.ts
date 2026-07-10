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
}))

const mockStorageSave = vi.fn().mockResolvedValue(undefined)
const mockStorageRead = vi.fn().mockResolvedValue(Buffer.from('img-data'))
const mockStorageDelete = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/storage', () => ({
  storageSave: (...args: unknown[]) => mockStorageSave(...args),
  storageRead: (...args: unknown[]) => mockStorageRead(...args),
  storageDelete: (...args: unknown[]) => mockStorageDelete(...args),
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

  it('saveImage saves to storage and inserts metadata into images collection', async () => {
    const mockInsert = vi.fn().mockResolvedValue({})
    mockDb.collection.mockReturnValue({ insertOne: mockInsert })

    const { saveImage } = await import('@/lib/gridfs')
    const { ObjectId } = await import('mongodb')
    const id = new ObjectId()
    await saveImage(mockDb as never, id as never, 'test.jpg', 'image/jpeg', Buffer.from('data'), {
      userId: 'u1', originalName: 'test.jpg', uploadedAt: new Date(),
    })

    expect(mockStorageSave).toHaveBeenCalledWith('abc123', Buffer.from('data'), 'image/jpeg')
    expect(mockDb.collection).toHaveBeenCalledWith('images')
    expect(mockInsert).toHaveBeenCalledOnce()
    const doc = mockInsert.mock.calls[0][0]
    expect(doc._id).toBe(id)
    expect(doc.filename).toBe('test.jpg')
    expect(doc.contentType).toBe('image/jpeg')
    expect(doc.length).toBe(4)
    expect(doc.metadata.userId).toBe('u1')
    expect(doc).not.toHaveProperty('data')  // binary no longer stored in MongoDB
  })

  it('getImageById returns null when metadata not found in MongoDB', async () => {
    mockDb.collection.mockReturnValue({ findOne: vi.fn().mockResolvedValue(null) })

    const { getImageById } = await import('@/lib/gridfs')
    const { ObjectId } = await import('mongodb')
    const result = await getImageById(mockDb as never, new ObjectId() as never)

    expect(result).toBeNull()
    expect(mockStorageRead).not.toHaveBeenCalled()
  })

  it('getImageById returns null when storage file is missing', async () => {
    mockDb.collection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue({
        contentType: 'image/png', length: 8, filename: 'photo.png', metadata: { userId: 'u1' },
      }),
    })
    mockStorageRead.mockResolvedValueOnce(null)

    const { getImageById } = await import('@/lib/gridfs')
    const { ObjectId } = await import('mongodb')
    const result = await getImageById(mockDb as never, new ObjectId() as never)

    expect(result).toBeNull()
  })

  it('getImageById returns image data from storage when found', async () => {
    mockDb.collection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue({
        contentType: 'image/png', length: 8, filename: 'photo.png', metadata: { userId: 'u1' },
      }),
    })
    mockStorageRead.mockResolvedValueOnce(Buffer.from('img-data'))

    const { getImageById } = await import('@/lib/gridfs')
    const { ObjectId } = await import('mongodb')
    const result = await getImageById(mockDb as never, new ObjectId() as never)

    expect(result).toEqual({
      contentType: 'image/png',
      data: Buffer.from('img-data'),
      length: 8,
      filename: 'photo.png',
      metadata: { userId: 'u1' },
    })
    expect(mockStorageRead).toHaveBeenCalledWith('abc123')
  })

  it('deleteImageById deletes from storage and MongoDB', async () => {
    mockDb.collection.mockReturnValue({
      deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    })

    const { deleteImageById } = await import('@/lib/gridfs')
    const { ObjectId } = await import('mongodb')
    const result = await deleteImageById(mockDb as never, new ObjectId() as never)

    expect(mockStorageDelete).toHaveBeenCalledWith('abc123')
    expect(mockDb.collection).toHaveBeenCalledWith('images')
    expect(result).toBe(true)
  })
})
