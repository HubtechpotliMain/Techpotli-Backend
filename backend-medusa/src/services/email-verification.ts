import { Resend } from "resend"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export interface EmailVerificationService {
  sendVerificationEmail(params: {
    email: string
    token: string
    firstName?: string
  }): Promise<void>
}

class EmailVerificationServiceImpl implements EmailVerificationService {
  private resend: Resend
  private emailFrom: string
  private backendUrl: string
  private frontendUrl: string

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is required")
    }

    this.resend = new Resend(apiKey)
    this.emailFrom = process.env.EMAIL_FROM || "noreply@techpotli.com"
    this.backendUrl = process.env.BACKEND_URL || "http://localhost:9000"
    this.frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
  }

  async sendVerificationEmail({
    email,
    token,
    firstName,
  }: {
    email: string
    token: string
    firstName?: string
  }): Promise<void> {
    const verificationUrl = `${this.backendUrl}/auth/verify-email?token=${encodeURIComponent(token)}`
    const frontendSuccessUrl = `${this.frontendUrl}/account?verified=true`

    const greeting = firstName ? `Hi ${firstName},` : "Hi there,"

    try {
      await this.resend.emails.send({
        from: this.emailFrom,
        to: email,
        subject: "Verify your email address",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Verify your email</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h1 style="color: #1a1a1a; margin-top: 0;">Verify your email address</h1>
                <p style="font-size: 16px; color: #666;">
                  ${greeting}
                </p>
                <p style="font-size: 16px; color: #666;">
                  Please verify your account by clicking the button below:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" 
                     style="display: inline-block; background-color: #ff9933; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Verify Email Address
                  </a>
                </div>
                <p style="font-size: 14px; color: #999; margin-top: 30px;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="font-size: 12px; color: #999; word-break: break-all;">
                  ${verificationUrl}
                </p>
                <p style="font-size: 14px; color: #999; margin-top: 30px;">
                  This link will expire in 24 hours.
                </p>
                <p style="font-size: 14px; color: #999; margin-top: 20px;">
                  If you didn't create an account, you can safely ignore this email.
                </p>
              </div>
            </body>
          </html>
        `,
        text: `
${greeting}

Please verify your account by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.
        `,
      })
    } catch (error) {
      console.error("Failed to send verification email:", error)
      throw new Error("Failed to send verification email")
    }
  }
}

export default EmailVerificationServiceImpl
