import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDb = { collection: vi.fn() }

vi.mock('@/lib/mongodb', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

vi.mock('@/lib/gridfs', () => ({
  getImageById: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

const VALID_ID = '507f1f77bcf86cd799439011'
const USER_ID = 'user-abc'

describe('GET /api/images/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue(null)

    const { GET } = await import('@/app/api/images/[id]/route')
    const res = await GET({} as Request, { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid ObjectId format', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID } } as never)

    const { GET } = await import('@/app/api/images/[id]/route')
    const res = await GET({} as Request, { params: Promise.resolve({ id: 'invalid' }) })
    expect(res.status).toBe(400)
    expect((await res.json()).success).toBe(false)
  })

  it('returns 400 for empty id', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID } } as never)

    const { GET } = await import('@/app/api/images/[id]/route')
    const res = await GET({} as Request, { params: Promise.resolve({ id: '' }) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when image is not found', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID } } as never)
    const { getImageById } = await import('@/lib/gridfs')
    vi.mocked(getImageById).mockResolvedValue(null)

    const { GET } = await import('@/app/api/images/[id]/route')
    const res = await GET({} as Request, { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.status).toBe(404)
    expect((await res.json()).success).toBe(false)
  })

  it('returns 403 when image belongs to a different user', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID } } as never)
    const { getImageById } = await import('@/lib/gridfs')
    vi.mocked(getImageById).mockResolvedValue({
      contentType: 'image/png', data: Buffer.from('img'), length: 3,
      filename: 'x.png', metadata: { userId: 'other-user' },
    })

    const { GET } = await import('@/app/api/images/[id]/route')
    const res = await GET({} as Request, { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.status).toBe(403)
  })

  it('returns 200 with image bytes and correct content type', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID } } as never)
    const { getImageById } = await import('@/lib/gridfs')
    vi.mocked(getImageById).mockResolvedValue({
      contentType: 'image/png', data: Buffer.from('img-data'), length: 8,
      filename: 'photo.png', metadata: { userId: USER_ID },
    })

    const { GET } = await import('@/app/api/images/[id]/route')
    const res = await GET({} as Request, { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=3600')
  })

  it('defaults to image/jpeg when contentType is missing', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue({ user: { id: USER_ID } } as never)
    const { getImageById } = await import('@/lib/gridfs')
    vi.mocked(getImageById).mockResolvedValue({
      contentType: '', data: Buffer.from('img-data'), length: 8,
      filename: 'photo.jpg', metadata: { userId: USER_ID },
    })

    const { GET } = await import('@/app/api/images/[id]/route')
    const res = await GET({} as Request, { params: Promise.resolve({ id: VALID_ID }) })
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
  })
})
