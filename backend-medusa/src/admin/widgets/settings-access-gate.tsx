import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { ExclamationTriangle, ArrowLeft } from "@medusajs/icons"

/**
 * Widget that shows a "No permission" message on Users and Developer section
 * pages when the current admin does not have can_access_users_developer.
 * Injects into user list, API keys list, and workflow list so unauthorized
 * admins see a clear message instead of empty/403 content.
 */
const SettingsAccessGateWidget = () => {
  const [canAccess, setCanAccess] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/admin/custom/me-permissions", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { can_access_users_developer: false }))
      .then((data) => {
        if (!cancelled) setCanAccess(Boolean(data?.can_access_users_developer))
      })
      .catch(() => {
        if (!cancelled) setCanAccess(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Still loading: show nothing so the default page can render (they may have access)
  if (canAccess === null) return null
  // Has access: show nothing; let the normal Users/Developer content show
  if (canAccess) return null

  return (
    <Container className="mb-4 p-6 border border-ui-border-base rounded-lg bg-ui-bg-subtle">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-ui-tag-orange-bg">
          <ExclamationCircleSolid className="text-ui-tag-orange-icon" />
        </div>
        <div className="flex-1 min-w-0">
          <Heading level="h2" className="text-ui-fg-base mb-1">
            Access restricted
          </Heading>
          <Text className="text-ui-fg-subtle mb-4">
            You don&apos;t have permission to view Users or Developer sections.
            Only admins listed in ALLOWED_SETTINGS_ACCESS_EMAILS or granted
            access by a primary admin can see this area.
          </Text>
          <Button
            variant="secondary"
            size="small"
            onClick={() => window.location.assign("/")}
          >
            <ArrowLeft />
            Back to dashboard
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: [
    "user.list.before",
    "api_key.list.before",
    "workflow.list.before",
  ],
})

export default SettingsAccessGateWidget
