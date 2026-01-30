import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * When an invite is accepted, copy invite.metadata.can_access_users_developer to the new user
 * so they get Users & Developer access if the invite was created with that flag.
 * (Invite may already be deleted when this runs; we try to fetch it and skip if not found.)
 */
type InviteAcceptedPayload = { id: string }

export default async function inviteAcceptedHandler({
  event: { data },
  container,
}: SubscriberArgs<InviteAcceptedPayload>) {
  const inviteId = typeof data === "object" && data?.id ? data.id : (data as unknown as string)
  if (!inviteId) return

  const userModuleService = container.resolve(Modules.USER) as {
    retrieveInvite: (id: string) => Promise<{ email?: string; metadata?: Record<string, unknown> | null } | null>
    listUsers: (filters: { email: string[] }) => Promise<{ id: string; metadata?: Record<string, unknown> | null }[]>
    updateUsers: (data: { id: string; metadata?: Record<string, unknown> }[]) => Promise<unknown>
  }

  let invite: { email?: string; metadata?: Record<string, unknown> | null } | null
  try {
    invite = await userModuleService.retrieveInvite(inviteId)
  } catch {
    return
  }
  if (!invite?.email) return

  const flag = invite.metadata && invite.metadata.can_access_users_developer === true
  if (!flag) return

  const users = await userModuleService.listUsers({ email: [invite.email] })
  const user = users[0]
  if (!user) return

  const existing = (user.metadata || {}) as Record<string, unknown>
  if (existing.can_access_users_developer === true) return

  await userModuleService.updateUsers([
    {
      id: user.id,
      metadata: { ...existing, can_access_users_developer: true },
    },
  ])
}

export const config: SubscriberConfig = {
  event: "invite.accepted",
}
