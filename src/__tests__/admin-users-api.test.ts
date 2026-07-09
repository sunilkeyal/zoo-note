import { describe, it, expect, vi, beforeEach } from "vitest"

const mockDb = {
  collection: vi.fn(),
}
const mockCollection = vi.fn()

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_password") },
}))

vi.mock("@/lib/password", () => ({
  generatePassword: vi.fn().mockReturnValue("GenPass123!"),
}))

vi.mock("@/lib/email", () => ({
  sendUserWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetByAdminEmail: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.collection = mockCollection
})

describe("GET /api/admin/users", () => {
  it("returns 401 if not authenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users")
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 403 if not admin", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "user" } } as any)

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users")
    const res = await GET(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe("Forbidden")
  })

  it("returns paginated users list", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    const mockUsers = [
      { _id: { toString: () => "1" }, email: "a@a.com", displayName: "A", role: "admin", createdAt: new Date(), updatedAt: new Date() },
      { _id: { toString: () => "2" }, email: "b@b.com", displayName: "B", role: "user", createdAt: new Date(), updatedAt: new Date() },
    ]

    const mockSort = vi.fn().mockReturnThis()
    const mockSkip = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockReturnThis()
    const mockToArray = vi.fn().mockResolvedValue(mockUsers)
    const mockCountDocuments = vi.fn().mockResolvedValue(2)

    mockCollection.mockReturnValue({
      find: vi.fn().mockReturnValue({ sort: mockSort, skip: mockSkip, limit: mockLimit, toArray: mockToArray }),
      countDocuments: mockCountDocuments,
    })

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users?page=1&limit=20")
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.users).toHaveLength(2)
    expect(body.data.total).toBe(2)
    expect(body.data.page).toBe(1)
    expect(body.data.limit).toBe(20)
  })

  it("filters by search query", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    const mockFind = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    })
    mockCollection.mockReturnValue({
      find: mockFind,
      countDocuments: vi.fn().mockResolvedValue(0),
    })

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users?search=alice")
    await GET(req)

    const findCall = mockFind.mock.calls[0][0]
    expect(findCall.$or).toBeDefined()
    expect(findCall.$or[0].displayName.$regex).toBe("alice")
    expect(findCall.$or[0].displayName.$options).toBe("i")
  })

  it("filters by role", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    const mockFind = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    })
    mockCollection.mockReturnValue({
      find: mockFind,
      countDocuments: vi.fn().mockResolvedValue(0),
    })

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users?role=admin")
    await GET(req)

    const findCall = mockFind.mock.calls[0][0]
    expect(findCall.role).toBe("admin")
  })

  it("filters by status=disabled", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    const mockFind = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    })
    mockCollection.mockReturnValue({
      find: mockFind,
      countDocuments: vi.fn().mockResolvedValue(0),
    })

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users?status=disabled")
    await GET(req)

    const findCall = mockFind.mock.calls[0][0]
    expect(findCall.isActive).toBe(false)
  })

  it("filters by status=active using $ne:false", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    const mockFind = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    })
    mockCollection.mockReturnValue({ find: mockFind, countDocuments: vi.fn().mockResolvedValue(0) })

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users?status=active")
    await GET(req)

    const findCall = mockFind.mock.calls[0][0]
    expect(findCall.isActive).toEqual({ $ne: false })
  })

  it("filters by search and status=active together", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    const mockFind = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    })
    mockCollection.mockReturnValue({ find: mockFind, countDocuments: vi.fn().mockResolvedValue(0) })

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users?search=alice&status=active")
    await GET(req)

    const findCall = mockFind.mock.calls[0][0]
    expect(findCall.isActive).toEqual({ $ne: false })
    expect(findCall.$or).toBeDefined()
  })

  it("accepts sortField and sortDir params", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    const mockSort = vi.fn().mockReturnThis()
    const mockSkip = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockReturnThis()
    const mockToArray = vi.fn().mockResolvedValue([])
    mockCollection.mockReturnValue({
      find: vi.fn().mockReturnValue({ sort: mockSort, skip: mockSkip, limit: mockLimit, toArray: mockToArray }),
      countDocuments: vi.fn().mockResolvedValue(0),
    })

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users?sortField=email&sortDir=asc")
    await GET(req)

    expect(mockSort).toHaveBeenCalledWith({ email: 1 })
  })

  it("rejects invalid sortField by falling back to createdAt", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    const mockSort = vi.fn().mockReturnThis()
    mockCollection.mockReturnValue({
      find: vi.fn().mockReturnValue({ sort: mockSort, skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), toArray: vi.fn().mockResolvedValue([]) }),
      countDocuments: vi.fn().mockResolvedValue(0),
    })

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users?sortField=invalid&sortDir=asc")
    await GET(req)

    expect(mockSort).toHaveBeenCalledWith({ createdAt: 1 })
  })

  it("clamps limit to max 50", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    const mockLimit = vi.fn().mockReturnThis()
    mockCollection.mockReturnValue({
      find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ skip: vi.fn().mockReturnValue({ limit: mockLimit, toArray: vi.fn().mockResolvedValue([]) }) }) }),
      countDocuments: vi.fn().mockResolvedValue(0),
    })

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users?limit=999")
    await GET(req)

    expect(mockLimit).toHaveBeenCalledWith(50)
  })
})

describe("POST /api/admin/users", () => {
  it("returns 401 if not authenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { POST } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@test.com", displayName: "New", role: "user" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 403 if not admin", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "user" } } as any)

    const { POST } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@test.com", displayName: "New", role: "user" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it("returns 400 if missing required fields", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    const { POST } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@test.com" }), // missing displayName + role
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("creates a new user and returns it with temporary password", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    const mockInsertOne = vi.fn().mockResolvedValue({ insertedId: { toString: () => "new-id" } })
    const mockFindOne = vi.fn()
      .mockResolvedValueOnce(null) // no duplicate
      .mockResolvedValueOnce({ // created user
        _id: { toString: () => "new-id" },
        email: "new@test.com",
        displayName: "New User",
        role: "user",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

    mockCollection.mockReturnValue({
      findOne: mockFindOne,
      insertOne: mockInsertOne,
    })

    const { POST } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@test.com", displayName: "New User", role: "user" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.temporaryPassword).toBe("GenPass123!")
    expect(body.data.user.email).toBe("new@test.com")

    const { sendUserWelcomeEmail } = await import("@/lib/email")
    expect(sendUserWelcomeEmail).toHaveBeenCalledWith("new@test.com", "GenPass123!")
  })

  it("returns 409 if email already exists", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    mockCollection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue({ email: "existing@test.com" }),
    })

    const { POST } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "existing@test.com", displayName: "Existing", role: "user" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it("returns 400 if role is invalid", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    const { POST } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@test.com", displayName: "New", role: "superadmin" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe("GET /api/admin/users/[id]", () => {
  it("returns 401 if not authenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { GET } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/000000000000000000000001")
    const res = await GET(req, { params: { id: "000000000000000000000001" } })
    expect(res.status).toBe(401)
  })

  it("returns user without passwordHash", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    mockCollection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue({
        _id: { toString: () => "000000000000000000000001" },
        email: "u@u.com",
        displayName: "User",
        role: "user",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    })

    const { GET } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/000000000000000000000001")
    const res = await GET(req, { params: { id: "000000000000000000000001" } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.email).toBe("u@u.com")
    expect(body.data.passwordHash).toBeUndefined()
  })

  it("returns 404 if not found", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    mockCollection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue(null),
    })

    const { GET } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/000000000000000000000999")
    const res = await GET(req, { params: { id: "000000000000000000000999" } })
    expect(res.status).toBe(404)
  })
})

describe("PUT /api/admin/users/[id]", () => {
  it("updates user email", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 })

    mockCollection.mockReturnValue({
      findOne: vi.fn()
        .mockResolvedValueOnce({
          _id: { toString: () => "000000000000000000000001" },
          email: "old@test.com",
          displayName: "User",
          role: "user",
        })
        .mockResolvedValueOnce(null) // no duplicate email
        .mockResolvedValueOnce({
          _id: { toString: () => "000000000000000000000001" },
          email: "new@test.com",
          displayName: "User",
          role: "user",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      updateOne: mockUpdateOne,
    })

    const { PUT } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/000000000000000000000001", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@test.com" }),
    })
    const res = await PUT(req, { params: { id: "000000000000000000000001" } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.email).toBe("new@test.com")
    // Verify only updateOne was called (no insertOne)
    expect(mockUpdateOne).toHaveBeenCalled()
  })

  it("updates user fields", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 })

    mockCollection.mockReturnValue({
      findOne: vi.fn()
        .mockResolvedValueOnce({
          _id: { toString: () => "000000000000000000000001" },
          email: "u@u.com",
          displayName: "Old Name",
          role: "user",
        })
        .mockResolvedValueOnce({
          _id: { toString: () => "000000000000000000000001" },
          email: "u@u.com",
          displayName: "New Name",
          role: "admin",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      updateOne: mockUpdateOne,
      countDocuments: vi.fn().mockResolvedValue(2),
    })

    const { PUT } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/000000000000000000000001", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "New Name", role: "admin" }),
    })
    const res = await PUT(req, { params: { id: "000000000000000000000001" } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.displayName).toBe("New Name")
  })

  it("prevents disabling the last admin", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    mockCollection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue({
        _id: { toString: () => "000000000000000000000001" },
        email: "admin@test.com",
        role: "admin",
      }),
      countDocuments: vi.fn().mockResolvedValue(1),
    })

    const { PUT } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/000000000000000000000001", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PUT(req, { params: { id: "000000000000000000000001" } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("last admin")
  })

  it("allows admin to edit own email and displayName", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "000000000000000000000001", role: "admin" } } as any)

    const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 })
    const mockFindOne = vi.fn()
      .mockResolvedValueOnce({
        _id: { toString: () => "000000000000000000000001" },
        email: "admin@example.com",
        displayName: "Admin",
        role: "admin",
      })
      .mockResolvedValueOnce(null) // no duplicate email
      .mockResolvedValueOnce({
        _id: { toString: () => "000000000000000000000001" },
        email: "admin-new@example.com",
        displayName: "Admin Updated",
        role: "admin",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

    mockCollection.mockReturnValue({ findOne: mockFindOne, updateOne: mockUpdateOne })

    const { PUT } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/000000000000000000000001", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Admin Updated", email: "admin-new@example.com" }),
    })
    const res = await PUT(req, { params: { id: "000000000000000000000001" } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.displayName).toBe("Admin Updated")
    expect(body.data.email).toBe("admin-new@example.com")
  })

  it("rejects role downgrade from admin to user on self-edit", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "000000000000000000000001", role: "admin" } } as any)

    const mockFindOne = vi.fn().mockResolvedValue({
      _id: { toString: () => "000000000000000000000001" },
      email: "admin@example.com",
      displayName: "Admin",
      role: "admin",
    })
    mockCollection.mockReturnValue({ findOne: mockFindOne })

    const { PUT } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/000000000000000000000001", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user" }),
    })
    const res = await PUT(req, { params: { id: "000000000000000000000001" } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Cannot change your own role")
  })

  it("hashes and saves password when newPassword is provided in the PUT body", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    const bcrypt = await import("bcryptjs")
    const mockHash = vi.mocked(bcrypt.default.hash)
    mockHash.mockResolvedValue("hashed_new_pw" as never)

    const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 })
    const mockFindOne = vi.fn()
      .mockResolvedValueOnce({
        _id: { toString: () => "000000000000000000000001" },
        email: "u@u.com",
        displayName: "User",
        role: "user",
      })
      .mockResolvedValueOnce({
        _id: { toString: () => "000000000000000000000001" },
        email: "u@u.com",
        displayName: "User",
        role: "user",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

    mockCollection.mockReturnValue({ findOne: mockFindOne, updateOne: mockUpdateOne })

    const { PUT } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/000000000000000000000001", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "NewPass123!" }),
    })
    const res = await PUT(req, { params: { id: "000000000000000000000001" } })
    expect(res.status).toBe(200)

    const updateCall = mockUpdateOne.mock.calls[0]
    expect(updateCall[1].$set.passwordHash).toBe("hashed_new_pw")
    expect(mockHash).toHaveBeenCalledWith("NewPass123!", 12)
  })

  it("sends password reset email when password is changed via PUT", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 })
    const mockFindOne = vi.fn()
      .mockResolvedValueOnce({
        _id: { toString: () => "000000000000000000000001" },
        email: "u@u.com",
        displayName: "User",
        role: "user",
      })
      .mockResolvedValueOnce({
        _id: { toString: () => "000000000000000000000001" },
        email: "u@u.com",
        displayName: "User",
        role: "user",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

    mockCollection.mockReturnValue({ findOne: mockFindOne, updateOne: mockUpdateOne })

    const { PUT } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/000000000000000000000001", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "NewPass123!" }),
    })
    await PUT(req, { params: { id: "000000000000000000000001" } })

    // Give fire-and-forget a tick to run
    await new Promise((r) => setTimeout(r, 0))

    const { sendPasswordResetByAdminEmail } = await import("@/lib/email")
    expect(vi.mocked(sendPasswordResetByAdminEmail)).toHaveBeenCalledWith("u@u.com", "NewPass123!")
  })

  it("does not update password or send email when password field is blank", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 })
    const mockFindOne = vi.fn()
      .mockResolvedValueOnce({
        _id: { toString: () => "000000000000000000000001" },
        email: "u@u.com",
        displayName: "User",
        role: "user",
      })
      .mockResolvedValueOnce({
        _id: { toString: () => "000000000000000000000001" },
        email: "u@u.com",
        displayName: "User",
        role: "user",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

    mockCollection.mockReturnValue({ findOne: mockFindOne, updateOne: mockUpdateOne })

    const { PUT } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/000000000000000000000001", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "New Name", password: "" }),
    })
    await PUT(req, { params: { id: "000000000000000000000001" } })

    const updateCall = mockUpdateOne.mock.calls[0]
    expect(updateCall[1].$set.passwordHash).toBeUndefined()

    await new Promise((r) => setTimeout(r, 0))
    const { sendPasswordResetByAdminEmail } = await import("@/lib/email")
    expect(vi.mocked(sendPasswordResetByAdminEmail)).not.toHaveBeenCalled()
  })
})

describe("DELETE /api/admin/users/[id]", () => {
  it("deletes user and their data", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    mockCollection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue({
        _id: { toString: () => "000000000000000000000001" },
        email: "delete@test.com",
        role: "user",
      }),
      countDocuments: vi.fn().mockResolvedValue(2),
      deleteMany: vi.fn().mockResolvedValue({ deletedCount: 5 }),
      deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    })

    const { DELETE } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/000000000000000000000001", { method: "DELETE" })
    const res = await DELETE(req, { params: { id: "000000000000000000000001" } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("prevents deleting the last admin", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    mockCollection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue({
        _id: { toString: () => "000000000000000000000001" },
        email: "admin@test.com",
        role: "admin",
      }),
      countDocuments: vi.fn().mockResolvedValue(1),
    })

    const { DELETE } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/000000000000000000000001", { method: "DELETE" })
    const res = await DELETE(req, { params: { id: "000000000000000000000001" } })
    expect(res.status).toBe(400)
  })

  it("prevents deleting your own account", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "000000000000000000000001", role: "admin" } } as any)

    const { DELETE } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/000000000000000000000001", { method: "DELETE" })
    const res = await DELETE(req, { params: { id: "000000000000000000000001" } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Cannot delete your own account")
  })
})
