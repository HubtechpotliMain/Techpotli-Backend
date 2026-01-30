/**
 * Techpotli Admin — light theme tokens and global override CSS.
 * Light theme only. Optional subtle saffron accent (Hanuman ji inspired).
 * Used by admin-light-theme widget and for consistency across login/landing.
 */

export const TECHPOTLI_THEME = {
  /** Page / canvas background */
  bgPage: "#F5F7FA",
  /** Card / surface */
  bgCard: "#FFFFFF",
  /** Primary action (blue) */
  primary: "#2563EB",
  primaryHover: "#1D4ED8",
  /** Optional saffron accent — use sparingly (highlights, active state, small icons) */
  saffron: "#EAB308",
  saffronMuted: "#FDE68A",
  /** Text */
  textBase: "#111827",
  textMuted: "#6B7280",
  textSubtle: "#9CA3AF",
  /** Border */
  border: "#E5E7EB",
  /** Shadow */
  shadowSm: "0 1px 2px rgba(0, 0, 0, 0.05)",
  shadowMd: "0 1px 3px rgba(0, 0, 0, 0.08)",
} as const

const STYLE_ID = "techpotli-admin-light-theme"

/**
 * Global light theme CSS for the Medusa Admin app (post-login).
 * Overrides dark theme. Injected once into document.head by admin-light-theme widget.
 * Targets Medusa UI semantic classes (bg-ui-bg-*, text-ui-fg-*, etc.).
 */
export const getAdminLightThemeCSS = (): string => `
  /* Techpotli Admin — light theme (no dark mode) */
  body, [data-scope="provider"] {
    background: ${TECHPOTLI_THEME.bgPage} !important;
    color: ${TECHPOTLI_THEME.textBase} !important;
  }
  [class*="bg-ui-bg-subtle"] {
    background: ${TECHPOTLI_THEME.bgPage} !important;
  }
  [class*="bg-ui-bg-base"] {
    background: ${TECHPOTLI_THEME.bgCard} !important;
  }
  [class*="bg-ui-bg-field"] {
    background: ${TECHPOTLI_THEME.bgCard} !important;
    border-color: ${TECHPOTLI_THEME.border} !important;
  }
  [class*="text-ui-fg-base"] {
    color: ${TECHPOTLI_THEME.textBase} !important;
  }
  [class*="text-ui-fg-subtle"] {
    color: ${TECHPOTLI_THEME.textMuted} !important;
  }
  [class*="text-ui-fg-muted"] {
    color: ${TECHPOTLI_THEME.textSubtle} !important;
  }
  [class*="border-ui-border"] {
    border-color: ${TECHPOTLI_THEME.border} !important;
  }
  /* Saffron accent: use in custom components only (icons, small highlights), not full backgrounds */
`

export const ADMIN_LIGHT_THEME_STYLE_ID = STYLE_ID
