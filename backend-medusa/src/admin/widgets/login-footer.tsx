import { defineWidgetConfig } from "@medusajs/admin-sdk"

/**
 * Footer for the login page: trust and legal copy.
 * Renders below the form in login.after.
 */
const LoginFooterWidget = () => (
  <p className="mt-6 text-center text-xs text-[#9CA3AF]">
    © Techpotli • Secure Admin Access
  </p>
)

export const config = defineWidgetConfig({
  zone: "login.after",
})

export default LoginFooterWidget
