import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { canAccessUsersAndDeveloper } from "../../../../../utils/can-access-users-developer"
import { MedusaError } from "@medusajs/framework/utils"

/**
 * PATCH /admin/custom/users/:id/settings-access
 * Grant or revoke "Users & Developer" access for a user.
 * Only admins who already have can_access_users_developer can call this (e.g. you).
 * Body: { can_access_users_developer: true | false }
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const callerId = req.auth_context?.actor_id
  if (!callerId) {
    return res.status(401).json({
      message: "Authentication required",
      type: "authentication_error",
    })
  }

  const userModuleService = req.scope.resolve(Modules.USER) as {
    retrieveUser: (id: string) => Promise<{ id: string; metadata?: Record<string, unknown> | null } | null>
    updateUsers: (data: { id: string; metadata?: Record<string, unknown> }[]) => Promise<unknown>
  }

  const callerCanManage = await canAccessUsersAndDeveloper(userModuleService, callerId)
  if (!callerCanManage) {
    return res.status(403).json({
      message: "You do not have permission to change this setting.",
      type: "authorization_error",
    })
  }

  const targetUserId = req.params.id
  const body = req.body as { can_access_users_developer?: boolean }
  const value = body?.can_access_users_developer
  if (typeof value !== "boolean") {
    return res.status(400).json({
      message: "Body must include can_access_users_developer: true or false",
      type: "invalid_data",
    })
  }

  const targetUser = await userModuleService.retrieveUser(targetUserId)
  if (!targetUser) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `User with id ${targetUserId} was not found`)
  }

  const existing = (targetUser.metadata || {}) as Record<string, unknown>
  await userModuleService.updateUsers([
    {
      id: targetUserId,
      metadata: { ...existing, can_access_users_developer: value },
    },
  ])

  return res.status(200).json({
    id: targetUserId,
    can_access_users_developer: value,
  })
}
