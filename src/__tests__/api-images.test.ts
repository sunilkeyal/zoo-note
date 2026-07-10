import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDb = { collection: vi.fn() }

vi.mock('@/lib/mongodb', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

vi.mock('@/lib/gridfs', () => ({
  getImageById: vi.fn(),
}))

describe('GET /api/images/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for invalid ObjectId format', async () => {
    const { GET } = await import('@/app/api/images/[id]/route')
    const params = Promise.resolve({ id: 'invalid' })
    const res = await GET({} as Request, { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('returns 400 for empty id', async () => {
    const { GET } = await import('@/app/api/images/[id]/route')
    const params = Promise.resolve({ id: '' })
    const res = await GET({} as Request, { params })
    expect(res.status).toBe(400)
  })

  it('returns 404 when image is not found', async () => {
    const { getImageById } = await import('@/lib/gridfs')
    vi.mocked(getImageById).mockResolvedValue(null)

    const { GET } = await import('@/app/api/images/[id]/route')
    const params = Promise.resolve({ id: '507f1f77bcf86cd799439011' })
    const res = await GET({} as Request, { params })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('returns 200 with image when found and sets correct content type', async () => {
    const { getImageById } = await import('@/lib/gridfs')
    vi.mocked(getImageById).mockResolvedValue({
      contentType: 'image/png',
      data: Buffer.from('img-data'),
      length: 8,
      filename: 'photo.png',
      metadata: {},
    })

    const { GET } = await import('@/app/api/images/[id]/route')
    const params = Promise.resolve({ id: '507f1f77bcf86cd799439011' })
    const res = await GET({} as Request, { params })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
  })

  it('defaults to image/jpeg when contentType is missing', async () => {
    const { getImageById } = await import('@/lib/gridfs')
    vi.mocked(getImageById).mockResolvedValue({
      contentType: '',
      data: Buffer.from('img-data'),
      length: 8,
      filename: 'photo.jpg',
      metadata: {},
    })

    const { GET } = await import('@/app/api/images/[id]/route')
    const params = Promise.resolve({ id: '507f1f77bcf86cd799439011' })
    const res = await GET({} as Request, { params })
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
  })
})
