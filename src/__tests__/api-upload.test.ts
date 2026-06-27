import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

describe('POST /api/upload', () => {
  it('rejects unauthenticated requests', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue(null)

    const { POST } = await import('@/app/api/upload/route')
    const req = new Request('http://localhost/api/upload', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})
