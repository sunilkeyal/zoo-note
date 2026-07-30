// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockSharp, state } = vi.hoisted(() => {
  const state = {
    metadataWidth: 2000 as number | undefined,
    // Given a jpeg quality, return the encoded byte length.
    sizeForQuality: (q: number) => q * 1000,
    // Records the target width passed to resize().
    lastResizeWidth: undefined as number | undefined,
    toBufferCalls: [] as number[],
  }

  function makePipeline(currentQuality: number) {
    const pipeline: Record<string, unknown> = {}
    pipeline.resize = (width?: number) => {
      state.lastResizeWidth = width
      return pipeline
    }
    pipeline.jpeg = (opts?: { quality?: number }) => makePipeline(opts?.quality ?? currentQuality)
    pipeline.clone = () => makePipeline(currentQuality)
    pipeline.metadata = () => Promise.resolve({ width: state.metadataWidth })
    pipeline.toBuffer = () => {
      state.toBufferCalls.push(currentQuality)
      return Promise.resolve(Buffer.alloc(state.sizeForQuality(currentQuality)))
    }
    return pipeline
  }

  const mockSharp = vi.fn(() => makePipeline(100))
  return { mockSharp, state }
})

vi.mock("sharp", () => ({ default: mockSharp }))

import { compressImage } from "@/lib/image-compress"

const MAX_BYTES = 100 * 1024

beforeEach(() => {
  vi.clearAllMocks()
  state.metadataWidth = 2000
  state.sizeForQuality = (q: number) => q * 1000
  state.lastResizeWidth = undefined
  state.toBufferCalls = []
})

describe("compressImage", () => {
  it("returns a buffer at or under the size budget", async () => {
    // size = quality * 1000; budget 102400 → highest quality under budget is 102.
    state.sizeForQuality = (q: number) => q * 1000
    const out = await compressImage(Buffer.from("original"))
    expect(out.length).toBeLessThanOrEqual(MAX_BYTES)
    expect(out.length).toBeGreaterThan(0)
  })

  it("caps the resize width at the original width (no enlargement)", async () => {
    state.metadataWidth = 300
    await compressImage(Buffer.from("small"))
    expect(state.lastResizeWidth).toBe(300)
  })

  it("uses the largest configured width when the image is bigger", async () => {
    state.metadataWidth = 5000
    await compressImage(Buffer.from("large"))
    expect(state.lastResizeWidth).toBe(1200)
  })

  it("finds the best quality via binary search (fewer than 15 encodes)", async () => {
    await compressImage(Buffer.from("x"))
    expect(state.toBufferCalls.length).toBeGreaterThan(0)
    expect(state.toBufferCalls.length).toBeLessThanOrEqual(15)
  })

  it("falls back to the smallest width at quality 1 when nothing fits", async () => {
    // Every encode exceeds the budget regardless of quality/width.
    state.sizeForQuality = () => MAX_BYTES + 1
    const out = await compressImage(Buffer.from("huge"))
    // Fallback path resizes to 200 and encodes at quality 1.
    expect(state.lastResizeWidth).toBe(200)
    expect(out.length).toBe(MAX_BYTES + 1)
  })
})
