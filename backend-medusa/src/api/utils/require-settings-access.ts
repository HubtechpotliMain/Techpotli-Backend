import type { Request, Response, NextFunction } from "express"
import { authenticate } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { canAccessUsersAndDeveloper } from "./can-access-users-developer"

/**
 * Path prefixes that are "Users" or "Developer" sections.
 * Only admins whose email is in ALLOWED_SETTINGS_ACCESS_EMAILS (env only, no email in code)
 * or user.metadata.can_access_users_developer === true can access these.
 */
const USERS_AND_DEVELOPER_PATH_PREFIXES = [
  "/admin/users",
  "/admin/invites",
  "/admin/api-keys",
  "/admin/hooks",
  "/admin/workflows-executions",
  "/admin/index",
]

/** Invitees (not logged in) must be able to POST here to create their account. Do not require settings access. */
const INVITE_ACCEPT_PATH_PREFIX = "/admin/invites/accept"

const adminAuth = authenticate("user", ["bearer", "session", "api-key"])

/**
 * Middleware that restricts access to admin "Users" and "Developer" sections.
 * Runs admin authenticate first so auth_context is always set for the permission check.
 * Allowed if:
 * - User's email is in ALLOWED_SETTINGS_ACCESS_EMAILS (env only; set in .env, never in code), OR
 * - User's metadata.can_access_users_developer === true (set when inviting or editing user).
 */
export async function requireSettingsAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const path =
    (req.baseUrl && req.path ? req.baseUrl + req.path : null) ??
    (req.originalUrl ? req.originalUrl.split("?")[0] : "") ??
    req.path ??
    ""
  if (path.startsWith(INVITE_ACCEPT_PATH_PREFIX)) {
    return next()
  }
  const isRestrictedRoute = USERS_AND_DEVELOPER_PATH_PREFIXES.some((prefix) =>
    path.startsWith(prefix)
  )
  if (!isRestrictedRoute) {
    return next()
  }

  // Run admin auth first so we have actor_id; 401 is sent by authenticate if unauthenticated
  adminAuth(req, res, (authErr?: unknown) => {
    if (authErr) {
      return next(authErr)
    }
    const actorId = (req as Request & { auth_context?: { actor_id?: string }; scope?: { resolve: (key: string) => unknown } })
      .auth_context?.actor_id
    if (!actorId) {
      return next()
    }

    const scope = (req as Request & { scope?: { resolve: (key: string) => unknown } }).scope
    if (!scope) {
      return next()
    }
    const userModuleService = scope.resolve(Modules.USER) as {
      retrieveUser: (id: string) => Promise<{ email?: string; metadata?: Record<string, unknown> | null }>
    }
    if (!userModuleService?.retrieveUser) {
      return next()
    }
    canAccessUsersAndDeveloper(userModuleService, actorId)
      .then((allowed) => {
        if (allowed) {
          return next()
        }
        res.status(403).json({
          message: "You do not have permission to access Users or Developer sections.",
          type: "authorization_error",
        })
      })
      .catch((err) => next(err))
  })
}
