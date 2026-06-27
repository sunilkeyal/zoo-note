import { describe, it, expect } from 'vitest'

describe('GET /api/images/[id]', () => {
  it('returns 400 for invalid ObjectId format', async () => {
    const { GET } = await import('@/app/api/images/[id]/route')
    const params = Promise.resolve({ id: 'invalid' })
    const res = await GET({} as Request, { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})
