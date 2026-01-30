import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import {
  getAdminLightThemeCSS,
  ADMIN_LIGHT_THEME_STYLE_ID,
} from "../theme/light-theme"

/**
 * Injects Techpotli Admin light theme into the app (post-login).
 * Mounts on order.list.before (first common page after login); appends
 * a single <style> to document.head and does NOT remove it on unmount,
 * so the theme persists across navigation. No re-renders, no heavy JS.
 */
const AdminLightThemeWidget = () => {
  useEffect(() => {
    if (typeof document === "undefined") return
    if (document.getElementById(ADMIN_LIGHT_THEME_STYLE_ID)) return
    const style = document.createElement("style")
    style.id = ADMIN_LIGHT_THEME_STYLE_ID
    style.textContent = getAdminLightThemeCSS()
    document.head.appendChild(style)
    // Intentionally do not remove on unmount — theme persists for the session
  }, [])

  return null
}

export const config = defineWidgetConfig({
  zone: ["order.list.before", "product.list.before", "customer.list.before"],
})

export default AdminLightThemeWidget
