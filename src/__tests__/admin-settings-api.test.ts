import { describe, it, expect, vi, beforeEach } from "vitest"

const mockDb = { collection: vi.fn() }

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe("GET /api/admin/settings — auth", () => {
  it("returns 401 when unauthenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { GET } = await import("@/app/api/admin/settings/route")
    const res = await GET(new Request("http://localhost/api/admin/settings"))
    expect(res.status).toBe(401)
  })
})

describe("GET /api/admin/settings — response", () => {
  beforeEach(() => {
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "admin1", role: "admin" } }),
    }))
  })

  it("returns settings from DB merged with env defaults", async () => {
    const settingsCol = {
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { key: "app_name", value: "My Notes", updatedAt: new Date() },
        ]),
      }),
    }
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "app_settings") return settingsCol
      return {}
    })

    const { GET } = await import("@/app/api/admin/settings/route")
    const res = await GET(new Request("http://localhost/api/admin/settings"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.app_name).toBe("My Notes")
    expect(body.data.storage_provider).toBeDefined()
  })
})

describe("PUT /api/admin/settings — updates", () => {
  beforeEach(() => {
    vi.doMock("@/lib/auth", () => ({
      auth: vi.fn().mockResolvedValue({ user: { id: "admin1", role: "admin" } }),
    }))
  })

  it("updates allowed settings", async () => {
    const settingsCol = {
      updateOne: vi.fn().mockResolvedValue({}),
    }
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "app_settings") return settingsCol
      return {}
    })

    const req = new Request("http://localhost/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_name: "New Name" }),
    })

    const { PUT } = await import("@/app/api/admin/settings/route")
    const res = await PUT(req)
    expect(res.status).toBe(200)
    expect(settingsCol.updateOne).toHaveBeenCalled()
  })

  it("rejects invalid max_upload_size_mb", async () => {
    const settingsCol = { updateOne: vi.fn() }
    mockDb.collection.mockImplementation((name: string) => {
      if (name === "app_settings") return settingsCol
      return {}
    })

    const req = new Request("http://localhost/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_upload_size_mb: "abc" }),
    })

    const { PUT } = await import("@/app/api/admin/settings/route")
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })
})
