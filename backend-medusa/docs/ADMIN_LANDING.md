# Admin Landing Page — Architecture

## 1. Analysis summary

- **Folder structure**: Medusa v2 file-based API routes live under `src/api/`. Path is derived from directory: `src/api/health/route.ts` → `/health`, `src/api/home/route.ts` → `/home`, `src/api/mn.png/route.ts` → `/mn.png`.
- **Root path "/"**: The framework’s route sorter drops the matcher `"/"` (empty segments), so `GET /` is never registered. The landing is served at **GET /home** and **GET /** redirects to `/home` via `src/api/middlewares.ts`.
- **Existing routes**: `/home` (landing), `/health`, `/mn.png`, plus `/admin/*`, `/store/*`, `/auth/*`, `/webhooks/*`.
- **Public assets**: Logo at `public/mn.png` served by `GET /mn.png`.

## 2. Where this feature fits

- **Routing**: Landing at **GET /home** (`src/api/home/route.ts`). Root **GET /** redirects to `/home` via `src/api/middlewares.ts` (matcher `/` is dropped by the framework).
- **View/template**: Isolated in `src/api/views/admin-landing.ts` so the route stays thin and the template is TypeScript-owned (no loose HTML files).
- **Static asset**: Logo at `public/mn.png` served by `src/api/mn.png/route.ts` (unchanged).

## 3. Recommended folder structure

```
src/api/
  middlewares.ts        # Redirect GET / → /home
  home/
    route.ts            # GET /home — landing HTML (thin handler, delegates to view)
  route.ts              # GET / (not registered by framework; kept for reference)
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
| `src/api/views/admin-landing.ts` | View: `getAdminLandingHtml()`, inline CSS, copy (title, subtitle, CTA). |
| `src/api/home/route.ts` | **GET /home** — thin handler, sends landing HTML. |
| `src/api/middlewares.ts` | Redirect **GET /** → `/home` so root shows the landing. |
| `src/api/route.ts` | GET / (not registered; framework sorter drops "/"). |
| `src/api/mn.png/route.ts` | Logo stream, `Cache-Control: public, max-age=86400`. |
| `docs/ADMIN_LANDING.md` | This doc. |

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
