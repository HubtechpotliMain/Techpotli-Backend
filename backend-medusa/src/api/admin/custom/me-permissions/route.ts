import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { canAccessUsersAndDeveloper } from "../../../utils/can-access-users-developer"

/**
 * GET /admin/custom/me-permissions
 * Returns whether the current admin can access Users and Developer sections.
 * Use this in the dashboard to hide/show the Users and Developer menu items.
 */
type AdminRequest = MedusaRequest & { auth_context?: { actor_id?: string } }

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as AdminRequest).auth_context?.actor_id
  if (!actorId) {
    return res.status(200).json({ can_access_users_developer: false })
  }
  const userModuleService = req.scope.resolve(Modules.USER) as {
    retrieveUser: (id: string) => Promise<{ email?: string; metadata?: Record<string, unknown> | null } | null>
  }
  const canAccess = await canAccessUsersAndDeveloper(userModuleService, actorId)
  return res.status(200).json({ can_access_users_developer: canAccess })
}
