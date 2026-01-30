# Admin Landing Page (GET "/") — Architecture

## 1. Analysis summary

- **Folder structure**: Medusa v2 file-based API routes live under `src/api/`. Path is derived from directory: `src/api/route.ts` → `/`, `src/api/health/route.ts` → `/health`, `src/api/mn.png/route.ts` → `/mn.png`.
- **Existing routes**: `/` (landing), `/health`, `/mn.png`, plus `/admin/*`, `/store/*`, `/auth/*`, `/webhooks/*`. No Medusa config or core changes.
- **Public assets**: No built-in static mount for `public/`. Logo is served via a TypeScript route `GET /mn.png` that streams `public/mn.png` with caching.
- **"/" handling**: Implemented in `src/api/route.ts`. Load order: express → admin (/app) → API loader (registers our GET /). `/app` and store/admin APIs are untouched.

## 2. Where this feature fits

- **Routing**: Stays in `src/api/route.ts` (Medusa convention: one `route.ts` per path).
- **View/template**: Isolated in `src/api/views/admin-landing.ts` so the route stays thin and the template is TypeScript-owned (no loose HTML files).
- **Static asset**: Logo at `public/mn.png` served by `src/api/mn.png/route.ts` (unchanged).

## 3. Recommended folder structure

```
src/api/
  route.ts              # GET / — thin handler, delegates to view
  views/
    admin-landing.ts    # getAdminLandingHtml() — template + inline CSS
  mn.png/
    route.ts            # GET /mn.png — logo stream
  health/
    route.ts            # GET /health
  admin/  store/  auth/  webhooks/  … # unchanged
public/
  mn.png                # logo file
```

## 4. Files created or modified

| File | Role |
|------|------|
| `src/api/views/admin-landing.ts` | **Create** — view: `getAdminLandingHtml()`, inline CSS, copy (title, subtitle, CTA). |
| `src/api/route.ts` | **Modify** — import view, set `Content-Type` + `Cache-Control`, send HTML. No inline HTML. |
| `src/api/mn.png/route.ts` | **Unchanged** — logo stream, `Cache-Control: public, max-age=86400`. |
| `docs/ADMIN_LANDING.md` | **Create** — this doc. |

## 5. Performance and safety

- **Sub-100ms**: No DB, no auth on `/`. Template is a constant string; no file read per request.
- **Cache**: `Cache-Control: public, max-age=60` on the HTML so CDN/browser can cache; logo already cached 24h.
- **Medusa upgrades**: Only standard API routes and a pure TS view module; no core or config overrides.
- **Cold start**: No extra imports that touch DB or heavy libs; view is a simple function returning a string.

## 6. Why this design

- **TypeScript-first**: Route and view are `.ts`; no unowned HTML files.
- **Clear separation**: Route = HTTP; view = markup/CSS; asset = existing logo route.
- **Medusa v2 aligned**: Uses only `src/api/*/route.ts` and a non-route module under `api/views/`.
- **Scalable**: To change copy or layout, edit `admin-landing.ts`; to add another landing, add another view and route.
- **Zero impact** on `/app`, store APIs, admin APIs, or auth.
