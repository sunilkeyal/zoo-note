import { describe, it, expect } from 'vitest'

describe('GridFS utilities', () => {
  it('exports getBucket function', async () => {
    const { getBucket } = await import('@/lib/gridfs')
    expect(typeof getBucket).toBe('function')
  })
})
