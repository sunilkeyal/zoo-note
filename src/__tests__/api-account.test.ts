import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFindOne = vi.fn()
const mockUpdateOne = vi.fn()
const mockCollection = vi.fn(() => ({
  findOne: mockFindOne,
  updateOne: mockUpdateOne,
}))
const mockDb = { collection: mockCollection }

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue("hashed_new_password"),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe("PATCH /api/account", () => {
  it("returns 401 when not authenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ name: "Test" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized.")
  })

  it("returns 400 when name is empty string", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ name: "   " }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Name is required.")
  })

  it("returns 400 for invalid email format", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ email: "not-an-email" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Invalid email format.")
  })

  it("returns 400 when newPassword is fewer than 8 characters", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ newPassword: "short", currentPassword: "oldpassword" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("New password must be at least 8 characters.")
  })

  it("returns 400 when newPassword is provided without currentPassword", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ newPassword: "newpassword123" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Current password is required to set a new password.")
  })

  it("returns 403 when currentPassword is incorrect", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })
    const { default: bcrypt } = await import("bcryptjs")
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ newPassword: "newpassword123", currentPassword: "wrongpassword" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe("Current password is incorrect.")
  })

  it("returns 409 when new email is already taken", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    // First findOne: current user. Second findOne: email conflict check.
    mockFindOne
      .mockResolvedValueOnce({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })
      .mockResolvedValueOnce({ _id: "other-id", email: "taken@example.com" })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ email: "taken@example.com" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe("An account with this email already exists.")
  })

  it("updates name only and returns changed: ['name']", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Old Name", email: "old@example.com", passwordHash: "hash" })
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ name: "New Name" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.changed).toEqual(["name"])
  })

  it("updates email and returns changed: ['email']", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne
      .mockResolvedValueOnce({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })
      .mockResolvedValueOnce(null) // email not taken
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ email: "new@example.com" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.changed).toEqual(["email"])
  })

  it("updates password and returns changed: ['password']", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 })
    const { default: bcrypt } = await import("bcryptjs")
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ newPassword: "newpassword123", currentPassword: "oldpassword" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.changed).toEqual(["password"])
  })

  it("returns changed: [] when nothing has actually changed", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Same", email: "same@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Same", email: "same@example.com", passwordHash: "hash" })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ name: "Same", email: "same@example.com" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.changed).toEqual([])
  })

  it("updates name and email together and returns both in changed", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne
      .mockResolvedValueOnce({ _id: "507f1f77bcf86cd799439011", displayName: "Old Name", email: "old@example.com", passwordHash: "hash" })
      .mockResolvedValueOnce(null) // email uniqueness check
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name", email: "new@example.com" }),
    })
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.changed).toContain("name")
    expect(body.changed).toContain("email")
    expect(body.changed).toHaveLength(2)
  })

  it("returns 404 when user is not found in database", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue(null) // user not found

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
    })
    const res = await PATCH(req as any)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("User not found.")
  })
})
