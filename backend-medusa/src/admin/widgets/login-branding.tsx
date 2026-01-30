import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect, useRef } from "react"

const LOGIN_THEME_CLASS = "techpotli-login-light"

/**
 * Light-theme login page styles.
 * Trust, security, professionalism. No dark mode.
 */
const loginThemeStyles = `
  .${LOGIN_THEME_CLASS} {
    background: #F5F7FA !important;
    min-height: 100dvh;
  }
  .${LOGIN_THEME_CLASS} > div {
    background: #FFFFFF;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    padding: 2rem 1.75rem;
    max-width: 360px;
    width: 100%;
    margin: 1.5rem;
  }
  .${LOGIN_THEME_CLASS} [class*="text-ui-fg-subtle"] {
    color: #6B7280 !important;
  }
  .${LOGIN_THEME_CLASS} [class*="text-ui-fg-muted"] {
    color: #9CA3AF !important;
  }
  .${LOGIN_THEME_CLASS} [class*="text-ui-fg-interactive"] {
    color: #2563EB !important;
  }
  .${LOGIN_THEME_CLASS} [class*="text-ui-fg-interactive"]:hover {
    color: #1D4ED8 !important;
  }
  .${LOGIN_THEME_CLASS} input,
  .${LOGIN_THEME_CLASS} [class*="bg-ui-bg-field"] {
    background: #FFFFFF !important;
    border: 1px solid #E5E7EB !important;
    border-radius: 8px !important;
    color: #111827 !important;
  }
  .${LOGIN_THEME_CLASS} input::placeholder {
    color: #9CA3AF;
  }
  .${LOGIN_THEME_CLASS} input:focus {
    border-color: #2563EB !important;
    outline: none;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
  }
  .${LOGIN_THEME_CLASS} button[type="submit"] {
    background: #2563EB !important;
    color: #FFFFFF !important;
    border-radius: 8px !important;
    font-weight: 500;
    border: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  .${LOGIN_THEME_CLASS} button[type="submit"]:hover:not(:disabled) {
    background: #1D4ED8 !important;
  }
  /* UX fix: keep button visible during loading (disabled + spinner), not invisible */
  .${LOGIN_THEME_CLASS} button[type="submit"]:disabled,
  .${LOGIN_THEME_CLASS} button[type="submit"][aria-busy="true"] {
    background: #2563EB !important;
    color: #FFFFFF !important;
    opacity: 1 !important;
  }
  .${LOGIN_THEME_CLASS} button[type="submit"]:disabled [class*="animate"],
  .${LOGIN_THEME_CLASS} button[type="submit"] svg {
    color: #FFFFFF !important;
    stroke: #FFFFFF !important;
  }
  .${LOGIN_THEME_CLASS} h1,
  .${LOGIN_THEME_CLASS} [class*="Heading"] {
    color: #111827 !important;
    font-weight: 600;
  }
  .${LOGIN_THEME_CLASS} [class*="bg-ui-bg-base"] {
    background: #FEF2F2 !important;
    border: 1px solid #FECACA;
    border-radius: 8px;
  }
`

/**
 * Techpotli Admin login branding: light theme, logo, enterprise copy.
 * Hides default Medusa logo and applies trust-focused light UI.
 */
const LoginBrandingWidget = () => {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hideMedusaLogo = () => {
      const container = document.querySelector(
        "[class*='max-w'][class*='280px'][class*='flex-col']"
      ) as HTMLElement | null
      if (container?.firstElementChild) {
        ;(container.firstElementChild as HTMLElement).style.display = "none"
      } else {
        const medusaSvg = document.querySelector(
          'svg[viewBox="0 0 400 400"]'
        ) as SVGElement | null
        if (medusaSvg) {
          const wrapper = medusaSvg.closest(
            "[class*='rounded']"
          ) as HTMLElement | null
          if (wrapper) wrapper.style.display = "none"
        }
      }
    }

    const applyTheme = () => {
      const root = rootRef.current
      if (!root) return
      // Widget sits inside: gap-y-3 div -> max-w card div -> outer (min-h-dvh)
      const card = root.parentElement?.parentElement
      const outer = card?.parentElement
      if (outer && outer !== document.body) {
        outer.classList.add(LOGIN_THEME_CLASS)
      }
    }

    hideMedusaLogo()
    const t1 = setTimeout(() => {
      hideMedusaLogo()
      applyTheme()
    }, 50)
    const t2 = setTimeout(() => {
      hideMedusaLogo()
      applyTheme()
    }, 250)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <>
      <style>{loginThemeStyles}</style>
      <div ref={rootRef} className="mb-5 flex flex-col items-center gap-1">
        <img
          src="/mn.png"
          alt="Techpotli"
          className="h-10 w-auto max-w-[140px] object-contain"
        />
      </div>
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "login.before",
})

export default LoginBrandingWidget
