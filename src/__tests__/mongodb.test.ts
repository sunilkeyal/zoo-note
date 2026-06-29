import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCreateIndex, mockCollection, mockDbObj, mockClientMethods, mockMongoClient } = vi.hoisted(() => {
  const mockCreateIndex = vi.fn().mockResolvedValue(undefined)
  const mockCollection = vi.fn(() => ({ createIndex: mockCreateIndex }))
  const mockDbObj = { collection: mockCollection }
  const mockClientMethods = {
    connect: vi.fn().mockResolvedValue(undefined),
    db: vi.fn().mockReturnValue(mockDbObj),
    close: vi.fn().mockResolvedValue(undefined),
  }
  const mockMongoClient = vi.fn(function() { return mockClientMethods })

  return { mockCreateIndex, mockCollection, mockDbObj, mockClientMethods, mockMongoClient }
})

vi.mock('mongodb', () => ({
  MongoClient: mockMongoClient,
}))

describe('connectToDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    mockMongoClient.mockImplementation(function() { return mockClientMethods })
    mockClientMethods.connect.mockResolvedValue(undefined)
    mockClientMethods.db.mockReturnValue(mockDbObj)
    mockDbObj.collection = mockCollection
    mockCollection.mockReturnValue({ createIndex: mockCreateIndex })
    mockCreateIndex.mockResolvedValue(undefined)
  })

  it('creates a MongoClient with the connection URI', async () => {
    const { connectToDatabase } = await import('@/lib/mongodb')

    await connectToDatabase()

    expect(mockMongoClient).toHaveBeenCalledWith(expect.stringMatching(/^mongodb:\/\//), { serverSelectionTimeoutMS: 2000 })
  })

  it('connects the client and gets the database', async () => {
    const { connectToDatabase } = await import('@/lib/mongodb')

    await connectToDatabase()

    expect(mockClientMethods.connect).toHaveBeenCalledOnce()
    expect(mockClientMethods.db).toHaveBeenCalledOnce()
  })

  it('creates TTL index on passwordResetTokens', async () => {
    const { connectToDatabase } = await import('@/lib/mongodb')

    await connectToDatabase()

    expect(mockCollection).toHaveBeenCalledWith('passwordResetTokens')
    expect(mockCreateIndex).toHaveBeenCalledWith(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    )
  })

  it('creates TTL indexes on notes and folders with 7-day expiry', async () => {
    const { connectToDatabase } = await import('@/lib/mongodb')

    await connectToDatabase()

    expect(mockCollection).toHaveBeenCalledWith('notes')
    expect(mockCreateIndex).toHaveBeenCalledWith(
      { deletedAt: 1 },
      { expireAfterSeconds: 604800, background: true }
    )

    expect(mockCollection).toHaveBeenCalledWith('folders')
    expect(mockCreateIndex).toHaveBeenCalledWith(
      { deletedAt: 1 },
      { expireAfterSeconds: 604800, background: true }
    )
  })

  it('creates compound indexes for notes and folders', async () => {
    const { connectToDatabase } = await import('@/lib/mongodb')

    await connectToDatabase()

    expect(mockCreateIndex).toHaveBeenCalledWith(
      { userId: 1, isDeleted: 1 },
      { background: true }
    )
    expect(mockCreateIndex).toHaveBeenCalledWith(
      { userId: 1, isDeleted: 1 },
      { background: true }
    )
  })

  it('creates unique email index on users', async () => {
    const { connectToDatabase } = await import('@/lib/mongodb')

    await connectToDatabase()

    expect(mockCollection).toHaveBeenCalledWith('users')
    expect(mockCreateIndex).toHaveBeenCalledWith(
      { email: 1 },
      { unique: true, background: true }
    )
  })

  it('creates all 6 indexes', async () => {
    const { connectToDatabase } = await import('@/lib/mongodb')

    await connectToDatabase()

    expect(mockCreateIndex).toHaveBeenCalledTimes(6)
  })

  it('returns cached db on second call', async () => {
    const { connectToDatabase } = await import('@/lib/mongodb')

    const db1 = await connectToDatabase()
    const db2 = await connectToDatabase()

    expect(db1).toBe(db2)
    expect(mockClientMethods.connect).toHaveBeenCalledTimes(1)
    expect(mockClientMethods.db).toHaveBeenCalledTimes(1)
  })

  it('does not crash if index creation fails', async () => {
    mockCreateIndex.mockRejectedValue(new Error('Index exists'))

    const { connectToDatabase } = await import('@/lib/mongodb')

    await expect(connectToDatabase()).resolves.toBeDefined()
  })
})

describe('closeDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    mockMongoClient.mockImplementation(function() { return mockClientMethods })
    mockClientMethods.connect.mockResolvedValue(undefined)
    mockClientMethods.db.mockReturnValue(mockDbObj)
    mockClientMethods.close.mockResolvedValue(undefined)
    mockDbObj.collection = mockCollection
    mockCollection.mockReturnValue({ createIndex: mockCreateIndex })
    mockCreateIndex.mockResolvedValue(undefined)
  })

  it('closes the client', async () => {
    const { connectToDatabase, closeDatabase } = await import('@/lib/mongodb')

    await connectToDatabase()
    await closeDatabase()

    expect(mockClientMethods.close).toHaveBeenCalledOnce()
  })

  it('allows reconnection after close', async () => {
    const { connectToDatabase, closeDatabase } = await import('@/lib/mongodb')

    await connectToDatabase()
    await closeDatabase()

    mockClientMethods.connect.mockResolvedValue(undefined)
    mockClientMethods.db.mockReturnValue(mockDbObj)
    mockDbObj.collection = mockCollection
    mockCollection.mockReturnValue({ createIndex: mockCreateIndex })
    mockCreateIndex.mockResolvedValue(undefined)

    await connectToDatabase()

    expect(mockClientMethods.connect).toHaveBeenCalledTimes(2)
    expect(mockClientMethods.db).toHaveBeenCalledTimes(2)
  })

  it('is safe to call when not connected', async () => {
    const { closeDatabase } = await import('@/lib/mongodb')

    await expect(closeDatabase()).resolves.not.toThrow()
  })
})
