import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockBucket = {
  find: vi.fn(),
  openDownloadStream: vi.fn(),
}

vi.mock('@/lib/gridfs', () => ({
  getBucket: vi.fn().mockResolvedValue(mockBucket),
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

  it('returns 404 when image file is not found', async () => {
    mockBucket.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) })

    const { GET } = await import('@/app/api/images/[id]/route')
    const params = Promise.resolve({ id: '507f1f77bcf86cd799439011' })
    const res = await GET({} as Request, { params })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('returns 200 with image when found and sets correct content type', async () => {
    const mockFile = { contentType: 'image/png' }
    mockBucket.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue([mockFile]) })

    const mockStream = { on: vi.fn() }
    mockBucket.openDownloadStream.mockReturnValue(mockStream)

    const { GET } = await import('@/app/api/images/[id]/route')
    const params = Promise.resolve({ id: '507f1f77bcf86cd799439011' })
    const res = await GET({} as Request, { params })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
  })

  it('defaults to image/jpeg when contentType is missing', async () => {
    const mockFile = {}
    mockBucket.find.mockReturnValue({ toArray: vi.fn().mockResolvedValue([mockFile]) })
    mockBucket.openDownloadStream.mockReturnValue({ on: vi.fn() })

    const { GET } = await import('@/app/api/images/[id]/route')
    const params = Promise.resolve({ id: '507f1f77bcf86cd799439011' })
    const res = await GET({} as Request, { params })
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
  })
})
