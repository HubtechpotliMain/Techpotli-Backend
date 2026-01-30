# Techpotli Admin — Structure and Design

## Current structure (what exists)

### Backend (API)

- **Login UI**: Medusa dashboard SPA at `/app`; login route `/app/login`. We do **not** modify Medusa core. We extend via:
  - **i18n** (`src/admin/i18n/json/en.json`): Copy (title, hint, button, fields).
  - **Widgets** (`src/admin/widgets/login-branding.tsx`, `login-footer.tsx`): Logo, light theme CSS, footer. Login runs inside `@medusajs/dashboard` (built bundle).
- **Backend /home**: Served by backend at `GET /home` (and `GET /` redirects to `/home`). Implemented as **HTML string** from `src/api/views/admin-landing.ts`, returned by `src/api/home/route.ts`. This is the **public landing** (Techpotli branding, “Login to Dashboard” → `/app`), not the post-login admin app.
- **Post-login admin app**: The Medusa Admin SPA (orders, products, sidebar, etc.) is from `@medusajs/dashboard`. We cannot replace its routes or layout. We inject a **global light theme** via a widget that runs on list pages (`order.list.before`, etc.) and appends a `<style>` to `document.head` once per session.

### Styling

- **Medusa UI**: Uses semantic Tailwind-like classes (`bg-ui-bg-subtle`, `text-ui-fg-base`, etc.). No CSS variables in our scope; we override with `[class*="..."]` selectors.
- **Our additions**: 
  - Login: Scoped class `techpotli-login-light` on the login root; CSS in `login-branding.tsx`.
  - Backend /home: Inline CSS in `admin-landing.ts` (light theme).
  - Admin app: One global `<style id="techpotli-admin-light-theme">` from `theme/light-theme.ts`, injected by `admin-light-theme.tsx`.

### Theme

- **Light only**: No dark mode. Tokens in `src/admin/theme/light-theme.ts` (backgrounds, primary blue, optional saffron for accents).
- **Saffron**: Reserved for custom components (highlights, active state, small icons), not full backgrounds.

---

## Recommended folder structure

```
src/
  admin/
    i18n/
      index.ts              # Exports en (and other locales)
      json/
        en.json             # Techpotli copy (login, actions, fields)
    theme/
      light-theme.ts        # Theme tokens + getAdminLightThemeCSS()
    routes/
      hero-banners/
        page.tsx            # Custom admin route (Hero Banners)
    widgets/
      login-branding.tsx    # Login: logo, light theme, hide Medusa logo, button loading fix
      login-footer.tsx     # Login: "© Techpotli · Secure Admin Access"
      admin-light-theme.tsx # Injects global light theme into admin app (order/product/customer list)
    README.md
    tsconfig.json
  api/
    home/
      route.ts             # GET /home — serves admin landing HTML
    views/
      admin-landing.ts     # HTML template + inline CSS (light theme)
    middlewares.ts         # GET / → redirect /home
    mn.png/
      route.ts             # GET /mn.png — logo
    auth/ ... admin/ ... store/ ... webhooks/ ...
  ...
public/
  mn.png                   # Logo asset
```

**Separation of concerns**

- **Layout / page**: Medusa provides layout and pages; we add widgets (login, theme) and custom routes (e.g. Hero Banners).
- **Theme / styles**: Centralized in `src/admin/theme/light-theme.ts`; login uses its own scoped CSS in `login-branding.tsx`; backend landing uses inline CSS in `admin-landing.ts`.
- **Copy**: All in `src/admin/i18n/json/en.json`; no copy in logic.

---

## What was changed (summary)

| Area | Change |
|------|--------|
| **Backend /home** | `admin-landing.ts`: Dark theme replaced with light (white/soft gray, Techpotli branding, optional saffron in styles). Footer: "© Techpotli · Secure Admin Access". |
| **Login** | `login-branding.tsx`: Button loading state fix — submit button stays visible when disabled/loading (background + text + spinner). No auth logic changes. |
| **Admin app (post-login)** | New `admin-light-theme.tsx` widget (zones: order/product/customer list) injects global light theme CSS once into `document.head`. New `theme/light-theme.ts` for tokens and CSS string. |
| **Theme** | Single light palette in `light-theme.ts`; saffron for accents only. |

---

## Performance and auth

- **Performance**: No new animations; theme is one injected `<style>`, no extra re-renders from theme widget (it returns `null`). Auth and API unchanged.
- **Auth**: No changes to login flow, backend auth, or session handling. Only UI (layout, styles, copy) and one global style injection.
