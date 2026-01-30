# Production-Grade Ecommerce Architecture

**Techpotli – Medusa v2 Backend + Next.js Storefront + Admin**

This document is the principal-architect design for a production-ready system serving **~10k concurrent storefront users** (read-heavy) and **~100–200 admin users** (write-heavy), with reliable scaling, fast banner/product updates, and clear separation of concerns.

---

## 1. Architecture Overview

### 1.1 Current Stack (as analyzed)

| Layer | Technology | Notes |
|-------|------------|--------|
| **Backend** | Medusa v2.12.5 | Single process; no Redis/cache/event-bus in config |
| **Database** | External (e.g. Supabase/Postgres) | Via `DATABASE_URL` |
| **File storage** | R2 (custom provider) | `src/file-providers/r2-storage` |
| **Storefront** | Next.js (App Router) | Server components + `sdk.client.fetch` to backend |
| **Admin** | Medusa Admin (Vite) + custom Hero Banners page | Served from same backend |
| **Auth** | Medusa JWT + cookies | Email verification, Resend |
| **Payment** | Razorpay (custom module) | Webhooks + store verify route |

### 1.2 Request Flows

```
Storefront (READ-heavy)
  Next.js (SSR/ISR) → MEDUSA_BACKEND_URL/store/* → Medusa Store API → DB
  - /store/products, /store/regions, /store/collections, /store/product-categories
  - /store/hero-banners (custom)
  - /store/carts/*, /store/customers/me, /store/orders, /store/shipping-options

Admin (WRITE-heavy)
  Admin UI (Vite) → same origin /admin/* → Medusa Admin API → DB
  - /admin/hero-banners, /admin/hero-banners/:id, /admin/hero-banners/upload, /admin/hero-banners/batch
  - Medusa core admin APIs (products, orders, etc.)
```

### 1.3 Folder Structure (current, clean)

```
Backend (backend-medusa)
├── medusa-config.ts          # No Redis/cache/event-bus yet
├── src/
│   ├── api/
│   │   ├── admin/            # Admin APIs (hero-banners, custom)
│   │   ├── auth/             # Login, verify-email
│   │   ├── store/            # Store APIs (hero-banners, locales, razorpay/verify)
│   │   ├── webhooks/         # Razorpay
│   │   └── middlewares.ts    # Redirect / → /home
│   ├── modules/
│   │   ├── hero-banner/      # Model, service, migrations (indexes: is_active, sort_order)
│   │   └── payment-razorpay/
│   ├── workflows/            # README + seed workflow only
│   ├── subscribers/          # customer.created (email verification)
│   └── admin/                # Custom admin routes (hero-banners page)
Frontend (nextjs-starter-medusa)
├── src/lib/
│   ├── config.ts             # Medusa SDK baseUrl
│   ├── data/                 # products, cart, customer, regions, categories, hero (cookies, cache tags)
│   └── medusa/hero.ts        # getHeroBanners, getHeroCategories, getFeaturedCategoriesWithProducts
└── modules/hero/             # HeroBannerStrip, hero section (parallel data fetch)
```

**Separation:** Store APIs under `api/store/`, admin under `api/admin/`, custom module under `modules/`. No overengineering; long-term maintainable.

---

## 2. Performance Bottleneck Analysis

### 2.1 Backend (Medusa)

| Area | Finding | Impact |
|------|--------|--------|
| **No server-side cache** | `medusa-config.ts` has no Redis/caching module. Every storefront request hits the DB. | High: 10k users → DB becomes bottleneck. |
| **Store hero-banners** | `GET /store/hero-banners` calls `listActiveBanners()` → DB every time. Only HTTP `Cache-Control: public, max-age=300, stale-while-revalidate=600`. | Medium: CDN helps, but origin still hit on cache miss/revalidate. |
| **Medusa core store APIs** | `/store/products`, `/store/regions`, `/store/collections`, etc. are standard Medusa; no app-level cache. | High: products/regions/collections are hot paths. |
| **Admin hero-banners** | All CRUD + upload + batch are synchronous. Upload uses busboy + File module (R2); no background job. | Low–medium: acceptable for 100–200 admins; upload can be offloaded later. |
| **DB indexes** | Hero banner: `IDX_hero_banner_is_active`, `IDX_hero_banner_sort_order` already present. | Good. |
| **Heavy operations** | Email verification (customer.created) runs in subscriber; no queue. Razorpay webhook handlers are sync. | Medium: under load, consider async workflows. |

### 2.2 Storefront (Next.js)

| Area | Finding | Impact |
|------|--------|--------|
| **Data fetching** | Hero: `Promise.all([ getHeroCategories(), getHeroBanners(), getRegion(), getFeaturedCategoriesWithProducts() ])`. Good parallelism. | OK. |
| **Caching** | Next.js `getCacheOptions(tag)` + `cache: "force-cache"` + `revalidateTag` for cart/customer/orders. Hero banners: `revalidate: 60`. | Good for cacheable GETs; backend still hit when Next cache misses or revalidates. |
| **Products** | `listProductsWithSort` fetches **100 products** then sorts in memory and paginates. | High: wasteful at scale; should use server-side sort/limit/offset. |
| **First paint** | Layout fetches `retrieveCustomer`, `retrieveCart`, `listCartOptions` (when cart exists). Store page then fetches products. | Medium: multiple round-trips; cache-first on backend reduces latency. |

### 2.3 Admin UI

| Area | Finding | Impact |
|------|--------|--------|
| **No optimistic UI** | Create/Update/Delete/Toggle/Reorder all wait for API then `fetchBanners()`. | UI feels blocking. |
| **No skeleton loaders** | Single "Loading..." text. | Perceived slowness. |
| **No real-time** | Banner/product/order changes require refresh or re-fetch. | Admin doesn’t feel “live”. |

### 2.4 Banner / Product Update Flow

- **Banner:** Admin PATCH/POST/DELETE → HeroBannerService → DB. Storefront: `GET /store/hero-banners` with Cache-Control 5m + SWR 10m; Next.js revalidate 60s. So storefront can be up to ~60s stale (or 5m if CDN ignores revalidate).
- **Product:** Updated via Medusa Admin → core product APIs. Storefront product list/cache tags revalidate on cart/customer actions but not on product update; product listing can be stale until revalidation or TTL.

**Conclusion:** Biggest wins are (1) Redis cache-first for store APIs, (2) cache invalidation on admin updates, (3) fix `listProductsWithSort` to use server-side sort, (4) optimistic admin UI + optional WebSockets for admin-only real-time.

---

## 3. Redis Caching Strategy

### 3.1 Role of Redis

- **Primary cache layer** for storefront-facing read APIs.
- **Cache invalidation** on admin updates (banner, product, order).
- **Optional:** event-bus / workflow engine on Redis later (not required for first phase).

### 3.2 Medusa v2 Integration (upgrade-safe)

Use the **Caching Module** with **Redis provider** (v2.11+). Do **not** use the deprecated `@medusajs/medusa/cache-redis`; use `@medusajs/medusa/caching` with `@medusajs/caching-redis`.

**1. Add to `medusa-config.ts`:**

```ts
// medusa-config.ts
module.exports = defineConfig({
  projectConfig: { /* ... */ },
  modules: [
    {
      resolve: "@medusajs/medusa/caching",
      options: {
        providers: [
          {
            resolve: "@medusajs/caching-redis",
            id: "caching-redis",
            is_default: true,
            options: {
              redisUrl: process.env.CACHE_REDIS_URL,
              ttl: 300,                    // 5 min default
              prefix: "techpotli:",
              compressionThreshold: 2048,
            },
          },
        ],
      },
    },
    // ... file, hero-banner, payment
  ],
})
```

**2. Environment:** Set `CACHE_REDIS_URL=redis://localhost:6379` (or Upstash/ElastiCache in production). The Caching module is only registered when `CACHE_REDIS_URL` is set, so local dev without Redis continues to work (store hero-banners fall back to DB-only).

**3. Cache-first store reads:** Implement in custom **store** routes and, where possible, via Medusa’s query/caching (see below). For **custom** store routes (e.g. hero-banners), use the Caching Module service explicitly.

### 3.3 What to Cache (storefront only)

| Resource | Key pattern | TTL | Invalidate on |
|----------|-------------|-----|----------------|
| Hero banners (active) | `hero_banners:active` | 300 (5m) | banner create/update/delete/batch |
| Products list (per query hash) | `products:${hash(query)}` | 60–300 | product.updated / product.deleted (admin) |
| Regions list | `regions:list` | 3600 | region.updated (rare) |
| Collections list | `collections:list` | 300 | collection.updated |
| Categories (top-level) | `categories:top` | 300 | product_category.updated |

Do **not** cache per-user or per-cart data at this layer (carts, customer/me, orders list); Medusa/Next already use cookies and cache tags.

### 3.4 Invalidation (admin updates)

- **Hero banner:** On POST/PATCH/DELETE and batch PATCH in `api/admin/hero-banners/*`, after success call a small helper that deletes `hero_banners:active` (and optionally emits an admin WebSocket event).
- **Product/order:** Use Medusa subscribers (e.g. `product.updated`, `order.updated`) to delete the relevant cache keys or tags. Prefer tag-based keys (e.g. `products:*`) if using a tag pattern, or specific keys.

Implementation detail: resolve `Modules.CACHING` (or the container key for the Caching Module) and call `delete(key)` or `invalidate(tag)` after admin mutations.

---

## 4. WebSocket Usage Plan (Admin Only)

### 4.1 Scope

- **Use WebSockets (e.g. Socket.IO) only for admin-facing real-time updates.**
- **Do not use WebSockets for storefront users.** Storefront relies on CDN + short TTL + revalidation.

### 4.2 Events to Emit (admin channel)

| Event | When | Payload (example) |
|-------|------|-------------------|
| `banner.updated` | After hero banner create/update/delete/batch | `{ id?, ids?, action: 'created' \| 'updated' \| 'deleted' \| 'reordered' }` |
| `product.updated` | After product create/update/delete (Medusa core) | `{ id }` |
| `order.updated` | After order state change (e.g. placed, fulfilled) | `{ id, status? }` |

Only admin clients (authenticated admin session) should subscribe. Keep payloads minimal (IDs + action).

### 4.3 Implementation Outline

- **Server:** Add Socket.IO (or Medusa-compatible WS) on the **admin** path only (e.g. mount under `/admin-ws` or same origin with auth). Emit events from:
  - Custom admin hero-banner routes (after successful mutation).
  - Medusa subscribers for `product.updated` / `order.updated` (or equivalent events).
- **Admin UI:** One socket connection per admin tab; listen for `banner.updated`, `product.updated`, `order.updated`. On event: refetch affected list or apply optimistic update rollback/refresh.
- **Lightweight:** No storefront socket connections; no broadcasting to anonymous users.

### 4.4 File / Folder Suggestion

- `src/api/ws/` or `src/websocket/`: initialize Socket.IO server, attach to HTTP server (Medusa allows this in custom bootstrap or middleware).
- `src/subscribers/`: existing subscribers; add emission of `product.updated` / `order.updated` to WS.
- Admin hero-banner routes: after success, emit `banner.updated` and invalidate Redis cache.

---

## 5. Storefront Scalability Strategy

### 5.1 Goals

- **CDN-friendly APIs:** All store GETs support `Cache-Control` and optional `ETag`/`Last-Modified`.
- **Short TTL + revalidation:** 60s–5m TTL with stale-while-revalidate where appropriate.
- **No DB hit on every request:** Cache-first at backend (Redis) + Next.js data cache.

### 5.2 Backend (Medusa)

1. **Redis cache-first** for:
   - `GET /store/hero-banners` (custom): check Redis `hero_banners:active`; on miss, query DB, set cache, return. On admin banner change: invalidate and (optional) emit WS.
   - Optionally wrap other heavy store GETs (products, regions, collections) with same pattern if not already covered by Medusa’s caching (when enabled).
2. **Cache-Control headers** (already partially there):
   - Hero banners: keep `Cache-Control: public, max-age=300, stale-while-revalidate=600`.
   - Products/regions/collections: ensure public, short max-age (e.g. 60–300) + `stale-while-revalidate` for GETs that are not user-specific.

### 5.3 Next.js Storefront

1. **Keep** `getCacheOptions(tag)` + `revalidateTag` for cart, customer, orders, fulfillment.
2. **Hero banners:** Keep `revalidate: 60` and `cache: "force-cache"`; backend cache makes origin fast on revalidation.
3. **Fix `listProductsWithSort`:** Remove “fetch 100 then sort in memory”. Use server-side sort (Medusa `order` / `sort` params) and proper `limit`/`offset` so each page request is a single, small API call. This reduces latency and memory.
4. **First paint:** Rely on backend cache so first-time and revalidate requests are fast; no extra round-trips needed for cache warming if Redis is warm.

### 5.4 CDN / Infra

- Put CDN (Vercel Edge, Cloudflare, etc.) in front of **storefront** (Next.js) and optionally in front of **backend** for GET `/store/*` only. Admin should not be cached by CDN (or use short private cache).
- Store API responses with `Cache-Control: public, max-age=..., stale-while-revalidate=...` are CDN-cacheable; avoid caching cookies or `Vary: Cookie` for public store GETs where possible.

---

## 6. Concrete Code-Level Recommendations

### 6.1 Backend

1. **`medusa-config.ts`**  
   - Add Caching Module with Redis provider as above.  
   - Add `CACHE_REDIS_URL` to env example and deployment docs.

2. **`src/api/store/hero-banners/route.ts` (GET)**  
   - Resolve Caching Module.  
   - Key: `hero_banners:active`.  
   - Try `get(key)`; on hit return JSON from cache with same headers.  
   - On miss: call `heroBannerService.listActiveBanners()`, serialize to JSON, `set(key, json, ttl)`, return.  
   - Keep existing `Cache-Control: public, max-age=300, stale-while-revalidate=600`.

3. **`src/api/admin/hero-banners/route.ts` (POST), `[id]/route.ts` (PATCH, DELETE), `batch/route.ts` (PATCH)**  
   - After successful mutation, call a shared `invalidateHeroBannersCache(scope)` that deletes `hero_banners:active` from Redis.  
   - (Optional) Emit Socket.IO event `banner.updated` for admin clients.

4. **Cache invalidation helper**  
   - New file e.g. `src/utils/cache-invalidation.ts`: `invalidateHeroBannersCache(scope)`, resolve `Modules.CACHING` and `delete("techpotli:hero_banners:active")` (or with your prefix).

5. **Subscribers**  
   - Add or extend subscriber for `product.updated` / `order.updated` to invalidate product/order cache keys (or tags) and emit admin WebSocket event if Socket.IO is implemented.

6. **DB**  
   - Hero banner already has indexes. For product/order/category listing queries used by store, ensure Medusa’s default indexes exist; add composite indexes only if you see slow queries in production.

7. **Heavy operations**  
   - Move email sending (customer.created) and non-critical webhook side effects to async workflows (e.g. workflow engine with Redis) in a later phase so request path stays fast.

### 6.2 Admin UI

1. **Optimistic UI for hero banners**  
   - On Create: add a temporary banner to state with a temp id; on API success replace with server response; on failure revert and show error.  
   - On Update/Delete/Toggle/Reorder: apply change to state immediately; on failure revert and show error.

2. **Skeleton loaders**  
   - Replace "Loading..." with a table skeleton (rows + columns) and form skeleton for the create/edit panel.

3. **WebSocket client (when backend WS is ready)**  
   - Connect to admin WebSocket on mount; listen for `banner.updated`, `product.updated`, `order.updated`; refetch only the affected list or update local state to avoid full page refresh.

### 6.3 Storefront (Next.js)

1. **`src/lib/data/products.ts` – `listProductsWithSort`**  
   - Replace “fetch 100 then sort in JS” with a single store products call that uses Medusa’s `order` and pagination (`limit`, `offset`) so each page is one request. Remove client-side sort of large arrays.

2. **`src/lib/medusa/hero.ts` – `getHeroBanners`**  
   - Fix type: add missing comma in response type (e.g. `banners: Array<...>;` then `count: number`).  
   - Keep `revalidate: 60` and `cache: "force-cache"`; backend Redis makes origin fast.

3. **Regions/categories/collections**  
   - Ensure GETs use `getCacheOptions` and appropriate tags so Next.js cache is effective; backend Redis will reduce load on Medusa for these as well once wired.

---

## 7. Expected Performance Results

| Metric | Before | After (with Redis + fixes) |
|--------|--------|----------------------------|
| **Storefront GET /store/hero-banners** | DB hit every request (or every 60s revalidate) | Redis hit majority of requests; DB only on miss or after invalidation. |
| **Storefront product listing** | Up to 100 products fetched for sort, then in-memory sort | Single paginated, server-sorted request per page; lower latency and memory. |
| **Admin banner update → storefront visibility** | Up to 60s (Next revalidate) or 5m (CDN) | Invalidation on update; next storefront request gets fresh data (or 60s revalidate at Next). |
| **Admin UI feel** | Blocking save, full refetch | Optimistic updates + optional real-time refresh; perceived instant. |
| **Origin load at 10k concurrent** | High DB load on store APIs | Most store GETs served from Redis; DB load significantly reduced. |

**Rough targets:**

- **Storefront:** P95 for cached store GETs &lt; 50 ms (origin); first paint improved by fewer round-trips and smaller product payloads.
- **Admin:** Sub-second perceived response for banner CRUD with optimistic UI; real-time list updates when WebSockets are added.
- **Scalability:** Backend can scale horizontally behind a load balancer with shared Redis; DB connections and query rate stay within limits.

---

## 8. Implementation Order

1. **Phase 1 – Cache + invalidation**  
   - Add Redis Caching Module in `medusa-config.ts`.  
   - Cache-first GET `/store/hero-banners` + invalidation on admin hero-banner mutations.  
   - Fix `listProductsWithSort` to use server-side sort/pagination.

2. **Phase 2 – Admin UX**  
   - Optimistic UI and skeleton loaders for hero-banners admin.  
   - (Optional) Socket.IO for admin-only events and refetch on `banner.updated`.

3. **Phase 3 – Broaden cache + async**  
   - Extend cache-first to other store GETs (products, regions, collections) if needed.  
   - Add cache invalidation for product/order in subscribers.  
   - Move email/webhook side effects to async workflows if needed.

This keeps the design production-ready, upgrade-safe, and maintainable without overengineering.
