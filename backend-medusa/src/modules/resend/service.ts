import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import type {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { Resend } from "resend"

export type ResendOptions = {
  api_key: string
  from: string
  html_templates?: Record<
    string,
    {
      subject?: string
      content: string
    }
  >
}

type InjectedDependencies = {
  logger: Logger
}

const TEMPLATES = {
  PASSWORD_RESET: "password-reset",
  USER_INVITE: "user-invite",
} as const

type TemplateName = (typeof TEMPLATES)[keyof typeof TEMPLATES]

function buildPasswordResetHtml(data: { reset_url?: string; email?: string }): string {
  const resetUrl = data?.reset_url || "#"
  const email = data?.email || ""
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h1 style="color: #1a1a1a; margin-top: 0;">Reset Your Password</h1>
      <p style="font-size: 16px; color: #666;">
        Hello${email ? ` ${email}` : ""},
      </p>
      <p style="font-size: 16px; color: #666;">
        We received a request to reset your password. Click the button below to create a new password for your account.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}"
           style="display: inline-block; background-color: #ff9933; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 14px; color: #999;">
        Or copy and paste this URL into your browser:
      </p>
      <p style="font-size: 12px; color: #999; word-break: break-all;">${resetUrl}</p>
      <p style="font-size: 14px; color: #999; margin-top: 30px;">
        This link will expire in 15 minutes for security reasons.
      </p>
      <p style="font-size: 14px; color: #999;">
        If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
  </body>
</html>
`.trim()
}

function buildUserInviteHtml(data: { invite_url?: string; email?: string }): string {
  const inviteUrl = data?.invite_url || "#"
  const email = data?.email || ""
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're invited</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h1 style="color: #1a1a1a; margin-top: 0;">You're invited</h1>
      <p style="font-size: 16px; color: #666;">
        Hello${email ? ` ${email}` : ""},
      </p>
      <p style="font-size: 16px; color: #666;">
        You have been invited to join as an admin user. Click the button below to accept the invite and set up your account.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}"
           style="display: inline-block; background-color: #ff9933; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          Accept Invite
        </a>
      </div>
      <p style="font-size: 14px; color: #999;">
        Or copy and paste this URL into your browser:
      </p>
      <p style="font-size: 12px; color: #999; word-break: break-all;">${inviteUrl}</p>
      <p style="font-size: 14px; color: #999; margin-top: 30px;">
        This invite link will expire. If you didn't expect this email, you can safely ignore it.
      </p>
    </div>
  </body>
</html>
`.trim()
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-resend"

  private resendClient: Resend
  private options: ResendOptions
  private logger: Logger

  constructor(
    { logger }: InjectedDependencies,
    options: ResendOptions
  ) {
    super()
    this.resendClient = new Resend(options.api_key)
    this.options = options
    this.logger = logger
  }

  static validateOptions(options: Record<string, unknown>): void {
    if (!options?.api_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Option `api_key` is required in the provider's options."
      )
    }
    if (!options?.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Option `from` is required in the provider's options."
      )
    }
  }

  private getTemplateContent(template: TemplateName, data: Record<string, unknown>): string | null {
    if (this.options.html_templates?.[template]?.content) {
      return this.options.html_templates[template].content
    }
    switch (template) {
      case TEMPLATES.PASSWORD_RESET:
        return buildPasswordResetHtml(data as { reset_url?: string; email?: string })
      case TEMPLATES.USER_INVITE:
        return buildUserInviteHtml(data as { invite_url?: string; email?: string })
      default:
        return null
    }
  }

  private getTemplateSubject(template: TemplateName): string {
    if (this.options.html_templates?.[template]?.subject) {
      return this.options.html_templates[template].subject!
    }
    switch (template) {
      case TEMPLATES.PASSWORD_RESET:
        return "Reset Your Password"
      case TEMPLATES.USER_INVITE:
        return "You're invited to join"
      default:
        return "Notification"
    }
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    if (!notification?.to) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No notification recipient (to) provided."
      )
    }

    const template = (notification.template as TemplateName) || ""
    const data = (notification.data || {}) as Record<string, unknown>

    // Support pre-built content (subject + html) if provided by caller
    const content = notification.content as { subject?: string; html?: string } | undefined
    if (content?.subject != null && content?.html != null) {
      try {
        const { data: resData, error } = await this.resendClient.emails.send({
          from: this.options.from,
          to: notification.to,
          subject: content.subject,
          html: content.html,
        })
        if (error) {
          this.logger.error("Resend send failed", error)
          return {}
        }
        return { id: resData?.id }
      } catch (err) {
        this.logger.error("Resend send error", err)
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Failed to send email: ${err instanceof Error ? err.message : "unknown error"}`
        )
      }
    }

    const html = this.getTemplateContent(template, data)
    if (!html) {
      this.logger.error(
        `No email template for "${template}". Supported: ${Object.values(TEMPLATES).join(", ")}`
      )
      return {}
    }

    const subject = this.getTemplateSubject(template)

    try {
      const { data: resData, error } = await this.resendClient.emails.send({
        from: this.options.from,
        to: notification.to,
        subject,
        html,
      })
      if (error) {
        this.logger.error("Resend send failed", error)
        return {}
      }
      return { id: resData?.id }
    } catch (err) {
      this.logger.error("Resend send error", err)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to send email: ${err instanceof Error ? err.message : "unknown error"}`
      )
    }
  }
}

export default ResendNotificationProviderService
