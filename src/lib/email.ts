import { Resend } from "resend"

const resendApiKey = process.env.RESEND_API_KEY
const emailFrom = process.env.EMAIL_FROM || "noreply@mylaunch.top"

let resendClient: Resend | null = null
if (resendApiKey) {
  resendClient = new Resend(resendApiKey)
}

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string
): Promise<void> {
  if (!resendClient) {
    console.log(`[Password Reset] Link: ${resetLink}`)
    return
  }

  const { error } = await resendClient.emails.send({
    from: emailFrom,
    to,
    subject: "Reset your password",
    html: `<p>Click the link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in 1 hour.</p>`,
  })

  if (error) {
    console.error("[Resend] Failed to send email:", error)
    throw new Error(error.message)
  }
}

export async function sendUserWelcomeEmail(
  to: string,
  temporaryPassword: string
): Promise<void> {
  if (!resendClient) {
    console.log(`[Welcome] Email: ${to}, Temporary password: ${temporaryPassword}`)
    return
  }

  const { error } = await resendClient.emails.send({
    from: emailFrom,
    to,
    subject: "Your ZooNoteBar account has been created",
    html: `<p>An admin has created an account for you at ZooNoteBar.</p><p>Your temporary password is: <strong>${temporaryPassword}</strong></p><p>Please log in and change your password.</p>`,
  })

  if (error) {
    console.error("[Resend] Failed to send welcome email:", error)
    throw new Error(error.message)
  }
}

export async function sendPasswordResetByAdminEmail(
  to: string,
  temporaryPassword: string
): Promise<void> {
  if (!resendClient) {
    console.log(`[Admin Password Reset] Email: ${to}, Temporary password: ${temporaryPassword}`)
    return
  }

  const { error } = await resendClient.emails.send({
    from: emailFrom,
    to,
    subject: "Your ZooNoteBar password has been reset",
    html: `<p>An admin has reset your ZooNoteBar password.</p><p>Your new temporary password is: <strong>${temporaryPassword}</strong></p><p>Please log in and change your password.</p>`,
  })

  if (error) {
    console.error("[Resend] Failed to send reset email:", error)
    throw new Error(error.message)
  }
}
