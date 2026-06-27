import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGridFSBucket = vi.fn()
const mockDb = {}

vi.mock('@/lib/mongodb', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

vi.mock('mongodb', () => ({
  GridFSBucket: mockGridFSBucket,
  ObjectId: class ObjectId {
    toHexString() { return 'abc123' }
  },
}))

describe('GridFS utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('exports getBucket as a function', async () => {
    const { getBucket } = await import('@/lib/gridfs')
    expect(typeof getBucket).toBe('function')
  })

  it('getBucket creates a new GridFSBucket and returns it', async () => {
    mockGridFSBucket.mockImplementation(function () { return { bucketName: 'images' } })

    const { getBucket } = await import('@/lib/gridfs')
    const result = await getBucket()

    expect(mockGridFSBucket).toHaveBeenCalledWith(mockDb, { bucketName: 'images' })
    expect(result).toEqual({ bucketName: 'images' })
  })

  it('getBucket caches and returns the same instance on second call', async () => {
    const instances: object[] = []
    mockGridFSBucket.mockImplementation(function () {
      const inst = { bucketName: 'images' }
      instances.push(inst)
      return inst
    })

    const { getBucket } = await import('@/lib/gridfs')
    const a = await getBucket()
    const b = await getBucket()

    expect(mockGridFSBucket).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('exports imageUrl helper', async () => {
    const { imageUrl } = await import('@/lib/gridfs')
    expect(typeof imageUrl).toBe('function')
    expect(imageUrl('abc123')).toBe('/api/images/abc123')
  })
})
