import { Modules } from "@medusajs/framework/utils"

/**
 * Allowed emails are read only from env (ALLOWED_SETTINGS_ACCESS_EMAILS).
 * No email is hardcoded in code — set your admin email(s) in .env (gitignored).
 */
function getAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_SETTINGS_ACCESS_EMAILS
  if (!raw || typeof raw !== "string") {
    return []
  }
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Returns whether the given user (by id) can access Users and Developer sections.
 * Used by GET /admin/custom/me-permissions and the settings-access middleware.
 */
export async function canAccessUsersAndDeveloper(
  userModuleService: { retrieveUser: (id: string) => Promise<{ email?: string; metadata?: Record<string, unknown> | null } | null> },
  userId: string
): Promise<boolean> {
  const user = await userModuleService.retrieveUser(userId)
  if (!user) return false
  const allowedEmails = getAllowedEmails()
  const email = (user.email || "").toLowerCase()
  const allowedByEmail = allowedEmails.includes(email)
  const allowedByMetadata =
    user.metadata && typeof user.metadata.can_access_users_developer === "boolean"
      ? user.metadata.can_access_users_developer === true
      : false
  return allowedByEmail || allowedByMetadata
}
