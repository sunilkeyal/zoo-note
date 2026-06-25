import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockResendSend, mockResendConstructor } = vi.hoisted(() => {
  const mockResendSend = vi.fn()
  const mockResendConstructor = vi.fn(function() {
    return { emails: { send: mockResendSend } }
  })
  return { mockResendSend, mockResendConstructor }
})

vi.mock('resend', () => ({
  Resend: mockResendConstructor,
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()

  mockResendConstructor.mockImplementation(function() {
    return { emails: { send: mockResendSend } }
  })
  mockResendSend.mockResolvedValue({ error: null })
})

describe('sendPasswordResetEmail', () => {

  it('logs reset link to console when no RESEND_API_KEY is set', async () => {
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { sendPasswordResetEmail } = await import('@/lib/email')
    await sendPasswordResetEmail('user@example.com', 'https://example.com/reset?token=abc')

    expect(logSpy).toHaveBeenCalledWith('[Password Reset] Link: https://example.com/reset?token=abc')
    logSpy.mockRestore()
  })

  it('sends email via Resend when API key is set', async () => {
    process.env.RESEND_API_KEY = 're_abc123'
    process.env.EMAIL_FROM = 'noreply@test.com'

    const { sendPasswordResetEmail } = await import('@/lib/email')
    await sendPasswordResetEmail('user@example.com', 'https://example.com/reset?token=abc')

    expect(mockResendSend).toHaveBeenCalledWith({
      from: 'noreply@test.com',
      to: 'user@example.com',
      subject: 'Reset your password',
      html: expect.stringContaining('https://example.com/reset?token=abc'),
    })
  })

  it('uses default from address when EMAIL_FROM is not set', async () => {
    process.env.RESEND_API_KEY = 're_abc123'
    delete process.env.EMAIL_FROM

    const { sendPasswordResetEmail } = await import('@/lib/email')
    await sendPasswordResetEmail('user@example.com', 'https://example.com/reset')

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'noreply@mylaunch.top' })
    )
  })

  it('throws on Resend error', async () => {
    process.env.RESEND_API_KEY = 're_abc123'
    mockResendSend.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })

    const { sendPasswordResetEmail } = await import('@/lib/email')
    await expect(
      sendPasswordResetEmail('user@example.com', 'https://example.com/reset')
    ).rejects.toThrow('Rate limit exceeded')
  })
})

describe('sendUserWelcomeEmail', () => {

  it('sends welcome email with temporary password', async () => {
    process.env.RESEND_API_KEY = 're_abc123'
    process.env.EMAIL_FROM = 'noreply@test.com'

    const { sendUserWelcomeEmail } = await import('@/lib/email')
    await expect(sendUserWelcomeEmail('test@test.com', 'TempPass123!')).resolves.not.toThrow()

    expect(mockResendSend).toHaveBeenCalledWith({
      from: 'noreply@test.com',
      to: 'test@test.com',
      subject: 'Your ZooNoteBar account has been created',
      html: expect.stringContaining('TempPass123!'),
    })
  })

  it('logs welcome info to console when no RESEND_API_KEY is set', async () => {
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { sendUserWelcomeEmail } = await import('@/lib/email')
    await sendUserWelcomeEmail('test@test.com', 'TempPass123!')

    expect(logSpy).toHaveBeenCalledWith('[Welcome] Email: test@test.com, Temporary password: TempPass123!')
    logSpy.mockRestore()
  })

  it('throws on Resend error for welcome email', async () => {
    process.env.RESEND_API_KEY = 're_abc123'
    mockResendSend.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })

    const { sendUserWelcomeEmail } = await import('@/lib/email')
    await expect(
      sendUserWelcomeEmail('test@test.com', 'TempPass123!')
    ).rejects.toThrow('Rate limit exceeded')
  })

  it('uses default EMAIL_FROM for welcome email when env var is not set', async () => {
    process.env.RESEND_API_KEY = 're_abc123'
    delete process.env.EMAIL_FROM

    const { sendUserWelcomeEmail } = await import('@/lib/email')
    await sendUserWelcomeEmail('test@test.com', 'TempPass123!')

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'noreply@mylaunch.top' })
    )
  })
})

describe('sendPasswordResetByAdminEmail', () => {

  it('sends reset email with temporary password', async () => {
    process.env.RESEND_API_KEY = 're_abc123'
    process.env.EMAIL_FROM = 'noreply@test.com'

    const { sendPasswordResetByAdminEmail } = await import('@/lib/email')
    await expect(sendPasswordResetByAdminEmail('test@test.com', 'NewPass456!')).resolves.not.toThrow()

    expect(mockResendSend).toHaveBeenCalledWith({
      from: 'noreply@test.com',
      to: 'test@test.com',
      subject: 'Your ZooNoteBar password has been reset',
      html: expect.stringContaining('NewPass456!'),
    })
  })

  it('logs admin reset info to console when no RESEND_API_KEY is set', async () => {
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { sendPasswordResetByAdminEmail } = await import('@/lib/email')
    await sendPasswordResetByAdminEmail('test@test.com', 'NewPass456!')

    expect(logSpy).toHaveBeenCalledWith('[Admin Password Reset] Email: test@test.com, Temporary password: NewPass456!')
    logSpy.mockRestore()
  })

  it('throws on Resend error for admin reset email', async () => {
    process.env.RESEND_API_KEY = 're_abc123'
    mockResendSend.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })

    const { sendPasswordResetByAdminEmail } = await import('@/lib/email')
    await expect(
      sendPasswordResetByAdminEmail('test@test.com', 'NewPass456!')
    ).rejects.toThrow('Rate limit exceeded')
  })

  it('uses default EMAIL_FROM for admin reset email when env var is not set', async () => {
    process.env.RESEND_API_KEY = 're_abc123'
    delete process.env.EMAIL_FROM

    const { sendPasswordResetByAdminEmail } = await import('@/lib/email')
    await sendPasswordResetByAdminEmail('test@test.com', 'NewPass456!')

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'noreply@mylaunch.top' })
    )
  })
})
