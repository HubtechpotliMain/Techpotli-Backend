import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

type InviteCreatedPayload = { id: string }[]

export default async function inviteCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<InviteCreatedPayload>) {
  const invites = Array.isArray(data) ? data : [data]
  const userModuleService = container.resolve(Modules.USER)
  const notificationModuleService = container.resolve(Modules.NOTIFICATION)

  const backendUrl = process.env.BACKEND_URL || "http://localhost:9000"
  const adminPath = "/app"

  for (const item of invites) {
    const inviteId = typeof item === "object" && item?.id ? item.id : (item as unknown as string)
    if (!inviteId) continue

    const invite = await userModuleService.retrieveInvite(inviteId).catch(() => null)
    if (!invite?.email) continue

    const inviteUrl = `${backendUrl}${adminPath}/invite?token=${encodeURIComponent(invite.token)}`

    await notificationModuleService.createNotifications({
      to: invite.email,
      channel: "email",
      template: "user-invite",
      data: {
        invite_url: inviteUrl,
        email: invite.email,
      },
    })
  }
}

export const config: SubscriberConfig = {
  event: "invite.created",
}
