import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

const mockEnsureAdmin = vi.fn()
const mockConnectToDatabase = vi.fn()
const mockBcryptCompare = vi.fn()
const mockCredentials = vi.fn()

vi.mock('@/lib/seed', () => ({ ensureAdmin: mockEnsureAdmin }))
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: mockConnectToDatabase }))
vi.mock('bcryptjs', () => ({ default: { compare: mockBcryptCompare } }))
vi.mock('@/lib/auth.config', () => ({
  authConfig: {
    pages: { signIn: '/login' },
    session: { strategy: 'jwt' },
    callbacks: {},
  },
}))
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  })),
  CredentialsSignin: class CredentialsSignin extends Error {
    code: string = 'CredentialsSignin'
  },
}))
vi.mock('next-auth/providers/credentials', () => ({ default: mockCredentials }))

let authorize: (...args: any[]) => any

describe('auth', () => {
  beforeAll(async () => {
    await import('@/lib/auth')
    authorize = mockCredentials.mock.calls[0][0].authorize
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('exports handlers, signIn, signOut, auth', async () => {
    const mod = await import('@/lib/auth')
    expect(mod.handlers).toBeDefined()
    expect(mod.signIn).toBeDefined()
    expect(mod.signOut).toBeDefined()
    expect(mod.auth).toBeDefined()
  })

  describe('authorize', () => {
    it('returns null when credentials missing', async () => {
      expect(await authorize({})).toBeNull()
      expect(await authorize({ email: 'test@test.com' })).toBeNull()
      expect(await authorize({ password: 'pass' })).toBeNull()
    })

    it('calls ensureAdmin', async () => {
      mockConnectToDatabase.mockResolvedValue({
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue(null),
      })
      mockEnsureAdmin.mockResolvedValue(undefined)

      await authorize({ email: 't@t.com', password: 'pass' })
      expect(mockEnsureAdmin).toHaveBeenCalled()
    })

    it('looks up user by lowercased trimmed email in MongoDB', async () => {
      const mockDb = {
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue(null),
      }
      mockConnectToDatabase.mockResolvedValue(mockDb)

      await authorize({ email: '  Test@Example.COM  ', password: 'pass' })
      expect(mockDb.collection).toHaveBeenCalledWith('users')
      expect(mockDb.findOne).toHaveBeenCalledWith({ email: 'test@example.com' })
    })

    it('returns null if user not found', async () => {
      mockConnectToDatabase.mockResolvedValue({
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue(null),
      })

      const result = await authorize({ email: 'missing@test.com', password: 'pass' })
      expect(result).toBeNull()
    })

    it('compares password with bcrypt', async () => {
      const mockUser = {
        _id: { toString: () => 'u1' },
        displayName: 'T',
        email: 't@t.com',
        role: 'user',
        passwordHash: 'hash123',
      }
      mockConnectToDatabase.mockResolvedValue({
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue(mockUser),
      })
      mockBcryptCompare.mockResolvedValue(true)

      await authorize({ email: 't@t.com', password: 'mypass' })
      expect(mockBcryptCompare).toHaveBeenCalledWith('mypass', 'hash123')
    })

    it('returns null if password does not match', async () => {
      mockConnectToDatabase.mockResolvedValue({
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({
          _id: { toString: () => 'u1' },
          passwordHash: 'hash123',
        }),
      })
      mockBcryptCompare.mockResolvedValue(false)

      const result = await authorize({ email: 't@t.com', password: 'wrong' })
      expect(result).toBeNull()
    })

    it('throws AccountDisabledError when user is disabled (isActive === false)', async () => {
      mockConnectToDatabase.mockResolvedValue({
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({
          _id: { toString: () => 'u1' },
          displayName: 'Disabled User',
          email: 'disabled@test.com',
          role: 'user',
          passwordHash: 'hash123',
          isActive: false,
        }),
      })
      mockBcryptCompare.mockResolvedValue(true)

      await expect(
        authorize({ email: 'disabled@test.com', password: 'correct' })
      ).rejects.toMatchObject({ code: 'AccountDisabled' })
    })

    it('allows login when isActive is true', async () => {
      mockConnectToDatabase.mockResolvedValue({
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({
          _id: { toString: () => 'u1' },
          displayName: 'Active User',
          email: 'active@test.com',
          role: 'user',
          passwordHash: 'hash123',
          isActive: true,
        }),
      })
      mockBcryptCompare.mockResolvedValue(true)

      const result = await authorize({ email: 'active@test.com', password: 'correct' })
      expect(result).toEqual({
        id: 'u1',
        name: 'Active User',
        email: 'active@test.com',
        role: 'user',
      })
    })

    it('allows login when isActive field is missing (backward compat)', async () => {
      mockConnectToDatabase.mockResolvedValue({
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({
          _id: { toString: () => 'u1' },
          displayName: 'Old User',
          email: 'old@test.com',
          role: 'user',
          passwordHash: 'hash123',
        }),
      })
      mockBcryptCompare.mockResolvedValue(true)

      const result = await authorize({ email: 'old@test.com', password: 'correct' })
      expect(result).toEqual({
        id: 'u1',
        name: 'Old User',
        email: 'old@test.com',
        role: 'user',
      })
    })

    it('returns user object with id, name, email, role on success', async () => {
      mockConnectToDatabase.mockResolvedValue({
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({
          _id: { toString: () => 'u1' },
          displayName: 'Test User',
          email: 't@t.com',
          role: 'admin',
          passwordHash: 'hash123',
        }),
      })
      mockBcryptCompare.mockResolvedValue(true)

      const result = await authorize({ email: 't@t.com', password: 'correct' })
      expect(result).toEqual({
        id: 'u1',
        name: 'Test User',
        email: 't@t.com',
        role: 'admin',
      })
    })
  })
})
