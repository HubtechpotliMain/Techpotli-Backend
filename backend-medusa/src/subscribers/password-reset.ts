import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

type PasswordResetPayload = {
  entity_id: string
  token: string
  actor_type: string
}

export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<PasswordResetPayload>) {
  const { entity_id: email, token, actor_type } = data
  const notificationModuleService = container.resolve(Modules.NOTIFICATION)

  // In production set BACKEND_URL and FRONTEND_URL so reset links point to your public URLs, not localhost.
  const backendUrl = (process.env.BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")
  const adminPath = "/app"
  const storefrontUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "")

  let urlPrefix: string
  if (actor_type === "customer") {
    urlPrefix = storefrontUrl
  } else {
    urlPrefix = `${backendUrl}${adminPath}`
  }

  const resetUrl = `${urlPrefix}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

  await notificationModuleService.createNotifications({
    to: email,
    channel: "email",
    template: "password-reset",
    data: {
      reset_url: resetUrl,
      email,
    },
  })
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
