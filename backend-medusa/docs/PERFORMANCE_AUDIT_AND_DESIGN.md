# Full Performance Audit & Production Design

**Techpotli – Principal Architect / Performance Engineer View**

This document is the result of a full codebase analysis. It provides a **performance audit**, **bottleneck list**, and **concrete plans** for Admin UI preloading, Redis caching, product listing/search, real-time (admin-only), and expected improvements. No code is written here—only analysis and design.

---

## 1. Full Performance Audit (UI + API + DB)

### 1.1 Medusa Backend Structure (analyzed)

| Component | Finding |
|-----------|--------|
| **Entry** | `medusa-config.ts` defines projectConfig (DB, CORS, JWT, cookie), modules: optional Caching (Redis), File (R2), hero-banner, Payment (Razorpay). |
| **API layout** | `src/api/`: `admin/` (hero-banners CRUD + upload + batch), `auth/` (login, verify-email), `store/` (hero-banners GET, locales, razorpay/verify, check-email-verified), `webhooks/razorpay`, `home`, `health`, `middlewares` (redirect `/` → `/home`). |
| **Custom modules** | `hero-banner` (model, service, migrations with `is_active` + `sort_order` indexes), `payment-razorpay`. |
| **Workflows / jobs** | `workflows/` has README + seed workflow only. No background job runner. |
| **Subscribers** | `customer.created` → email verification (sync, no queue). |
| **Cache** | Caching module registered only when `CACHE_REDIS_URL` is set. Used for **store hero-banners GET** (cache-first + invalidation on admin mutations). No Redis cache for products, regions, or collections. |

**Conclusion:** Backend is clean and separated. Only store hero-banners use Redis today; all other store reads hit the DB on every request when cache is cold or absent.

---

### 1.2 Admin UI Layout, Routing, and Rendering (analyzed)

| Area | Finding |
|------|--------|
| **Shell / layout** | **Not in our codebase.** Post-login admin (sidebar, header, routes) comes from **Medusa’s built-in dashboard** (`@medusajs/dashboard`). We **cannot replace** layout or shell; we extend via widgets and custom routes (see `docs/TECHPOTLI_ADMIN_STRUCTURE.md`). |
| **Routing** | Medusa Admin is a **Vite SPA**. Built and served from the same backend (e.g. `/app`). Our only custom **route** is Hero Banners (`src/admin/routes/hero-banners/page.tsx`) registered with `defineRouteConfig`. Core routes (orders, products, customers, etc.) are Medusa’s. |
| **Rendering** | Hero Banners page: **client-side only.** Single `useEffect` fetches `/admin/hero-banners` on mount; `loading` state shows "Loading..." until fetch completes; then table + form render. No SSR, no prefetch, no persistent shell optimization from our side (shell is Medusa’s). |
| **Widgets** | `login.before`: login branding (logo, light theme, button loading fix). `order.list.before`, `product.list.before`, `customer.list.before`: inject global light theme CSS once. Theme widget returns `null` (no extra DOM). |
| **Product/order lists** | **Medusa core.** We do not own the product list or order list UI; they are part of the dashboard. Any optimization for 50k products (virtualization, pagination, search) would be either Medusa defaults or framework extension points, not in this repo. |

**Conclusion:** Our control is limited to (1) custom Hero Banners page UX (loading, skeletons, optimistic updates) and (2) any Medusa-documented extension points for list/detail pages. The “persistent app shell” and “route-level prefetching” for the main dashboard are owned by Medusa; we can only tune what we own and recommend env/config for the rest.

---

### 1.3 Storefront API Usage (analyzed)

| API | Usage | Caching (backend) | Caching (Next) |
|-----|--------|-------------------|----------------|
| `GET /store/hero-banners` | `getHeroBanners()` in `lib/medusa/hero.ts` | **Redis cache-first** when `CACHE_REDIS_URL` set; invalidation on admin mutations. | `getCacheOptions("hero-banners")`, `revalidate: 60`, `force-cache`. |
| `GET /store/products` | `listProducts()`, `listProductsWithSort()` in `lib/data/products.ts` | **None.** Every request hits Medusa core → DB. | `getCacheOptions("products")`, `force-cache`; tags used for revalidation. |
| `GET /store/regions` | `listRegions()`, `getRegion()`, `retrieveRegion()` in `lib/data/regions.ts`; also `middleware.ts` for country. | **None.** | Next cache with tags. |
| `GET /store/collections` | `listCollections()`, `getCollectionByHandle()` in `lib/data/collections.ts`. | **None.** | Next cache. |
| `GET /store/product-categories` | `listCategories()` in `lib/data/categories.ts`. | **None.** | Next cache. |
| `GET /store/carts/:id` | `retrieveCart()` in `lib/data/cart.ts`. | Medusa core (no app-level cache; cart is user-specific). | `getCacheOptions("carts")`, revalidateTag on mutations. |
| `GET /store/customers/me` | `retrieveCustomer()` in `lib/data/customer.ts`. | Medusa core. | Tags + revalidateTag. |
| `GET /store/orders` | `getOrdersList()` in `lib/data/orders.ts`. | Medusa core. | Tags + revalidateTag. |
| `GET /store/shipping-options` | Cart shipping options. | Medusa core. | Tags. |

**Conclusion:** Storefront is read-heavy and depends on Next.js cache + backend. Only hero-banners have backend Redis; products/regions/collections/categories hit DB on every cache miss or revalidation, which will not scale to 10k concurrent users without more cache or CDN.

---

### 1.4 Product Listing & Search Flow (analyzed)

| Step | Current behavior |
|------|------------------|
| **Store / categories / collections pages** | Use `PaginatedProducts` → `listProductsWithSort({ page, sortBy, queryParams, countryCode })`. |
| **listProductsWithSort** | Calls `listProducts({ pageParam: 0, queryParams: { ...queryParams, **limit: 100** }, countryCode })` → **fetches 100 products** from `/store/products`, then **sorts in memory** via `sortProducts(products, sortBy)` (price_asc/price_desc/created_at), then **slices** for the current page. So for **every page view** we request up to 100 products and sort client-side. |
| **listProducts** | Uses `limit`, `offset`, `region_id`, `fields`; passes through to Medusa. Proper server-side pagination is used **only when** sort is not needed or when we use `listProducts` directly with pageParam (e.g. related products). |
| **Sort options** | `SortOptions = "price_asc" | "price_desc" | "created_at"`. Price sort **requires** client-side sort (comment in `sort-products.ts`: “until the store API supports sorting by price”). Created_at is passed as `order: "created_at"` in paginated-products only for that case, but we still fetch 100 and slice. |
| **Search** | **Header search** (`header-search.tsx`) is a **non-functional placeholder**: no `onSubmit`, no API call, no debounce. Storefront has **no product search** implemented. |
| **Admin product list** | Medusa dashboard’s product list; we don’t control it. 50k products would rely on Medusa’s admin API pagination and any built-in search. |

**Conclusion:** The main **storefront** product listing bottleneck is `listProductsWithSort`: fetch-100-then-sort-then-slice. It does not scale (memory, latency, DB load). Search is absent. Admin product management scale depends on Medusa’s implementation.

---

### 1.5 Banner / Hero Section Update Flow (analyzed)

| Step | Current behavior |
|------|------------------|
| **Admin** | Create/Update/Delete/Reorder via `/admin/hero-banners` (POST, PATCH, DELETE, batch PATCH). After each success, admin routes call `invalidateHeroBannersCache(req.scope)` so Redis key `hero_banners:active` is cleared. |
| **Storefront** | `getHeroBanners()` → `GET /store/hero-banners`. Backend: cache-first (Redis); on miss, DB then set cache. Response has `Cache-Control: public, max-age=300, stale-while-revalidate=600`. Next.js uses `revalidate: 60` and `force-cache`. |
| **Time to reflect** | After admin update: next storefront request that hits backend (cache miss) gets fresh data. With Redis invalidation, that’s immediate for that request. With Next revalidate 60s, other requests may see stale for up to 60s unless we add on-demand revalidation (e.g. webhook or tag revalidate from backend). So **1–2 seconds** is achievable for the first request after invalidation; CDN/Next may add up to 60s for others. |

**Conclusion:** Banner flow is already cache-invalidated on the backend; the main gap is ensuring storefront revalidation (e.g. tag or webhook) if we want all users to see updates within 1–2s globally.

---

### 1.6 Database Queries & Indexes (analyzed)

| Area | Finding |
|------|--------|
| **Custom module** | `hero_banner`: table with `id`, `title`, `image_url`, `redirect_url`, `is_active`, `sort_order`, `created_at`, `updated_at`. Indexes: `IDX_hero_banner_is_active`, `IDX_hero_banner_sort_order`. **Adequate** for listActiveBanners/listAdminBanners. |
| **Products / orders / customers** | Tables and indexes are **Medusa core** (not in our repo). We have no custom migrations for product, order, or customer. Performance at 50k products depends on Medusa’s schema and default indexes. |
| **Queries** | Hero banner: filtered by `is_active`, ordered by `sort_order` (index-friendly). Product listing: Medusa’s store API; we don’t see raw SQL. For 50k products, server-side pagination and indexed filters (e.g. category_id, collection_id, search) are essential; currently we bypass that with the 100-product fetch in listProductsWithSort. |

**Conclusion:** Hero banner is in good shape. Product/order scale depends on Medusa’s DB design; we should rely on server-side limit/offset and avoid fetching large slices (e.g. 100) for sort.

---

### 1.7 Current Caching (summary)

| Layer | What’s cached | What’s not |
|-------|----------------|------------|
| **Backend (Redis)** | `GET /store/hero-banners` (key `hero_banners:active`, TTL 300s). Invalidated on admin hero-banner mutations. | Products, regions, collections, categories, cart, customer, orders. |
| **Next.js** | Store: products, regions, collections, categories, hero-banners, cart, customer, orders use `getCacheOptions(tag)` and/or `revalidate` and `force-cache`. Tags used for revalidation on mutations. | No in-memory “warm” layer; every route can trigger backend calls on cache miss. |
| **CDN** | Not implemented in repo; depends on deployment. Store GETs that send `Cache-Control: public, max-age=...` are CDN-cacheable. | Admin and auth should not be CDN-cached. |

**Conclusion:** Backend cache is minimal (hero-banners only). Storefront scaling to 10k users will require either more backend cache (e.g. products/regions/collections) or strong CDN + short TTL and revalidation.

---

### 1.8 Loading States and UI Blocking Points (analyzed)

| Location | Current behavior | Issue |
|----------|------------------|--------|
| **Admin – Hero Banners page** | Initial: `loading === true` → single "Loading..." text in a container. After fetch: table + form. Create/Update/Delete/Toggle/Reorder: **await API then `fetchBanners()`**; no optimistic update; button stays clickable until response. | **Blocking:** Full blank loading state; after mutation, full refetch and re-render. No skeleton, no optimistic UI. |
| **Admin – Login** | Widget keeps submit button visible when disabled/loading (CSS). | **Good:** No button disappearing. |
| **Storefront – (main) layout** | **Blocking:** `await retrieveCustomer()`, `await retrieveCart()`, then if cart `await listCartOptions()`. Children render only after. So **every** page under (main) waits on customer + cart (+ shipping options). | Layout is a single waterfall; first paint delayed by these calls. |
| **Storefront – Home** | `await getRegion()`, `await listCollections()`, then HeroSection (parallel: getHeroCategories, getHeroBanners, getRegion, getFeaturedCategoriesWithProducts). Then TopDealsSection, FeaturedProducts. | Multiple round-trips; hero is parallelized but layout already waited on cart/customer. |
| **Storefront – Store / categories / collections** | `PaginatedProducts` in Suspense with `SkeletonProductGrid` fallback. But data load is `listProductsWithSort` (100 products + sort). | **Skeleton good;** data path is heavy and wrong (100 fetch). |
| **Storefront – Cart** | `loading.tsx` → `SkeletonCartPage`. | **Good.** |
| **Storefront – Account** | `loading.tsx` and `@dashboard/loading.tsx` → **Spinner** only (no skeleton). | **Weak:** Spinner instead of skeleton. |
| **Storefront – Order confirmed** | `loading.tsx` → `SkeletonOrderConfirmed`. | **Good.** |
| **Storefront – Checkout** | Payment/address/shipping use `isLoading` states and spinners/skeletons where implemented. | Mixed; some blocking. |
| **Storefront – Buttons** | Add to cart, delete, submit: various `isLoading` / `isDeleting`; some show spinner next to label. | Risk of buttons “disappearing” if not implemented consistently (login was explicitly fixed). |

**Conclusion:** Main blocking points: (1) **Admin Hero Banners:** full-page loading text, no skeleton, no optimistic UI. (2) **Storefront layout:** customer + cart + shipping options block every page. (3) **Product listing:** 100-product fetch + in-memory sort. (4) **Account:** spinner instead of skeleton.

---

## 2. List of Bottlenecks Causing Perceived Loading

- **Admin Hero Banners**
  - Blank "Loading..." until first fetch.
  - After every mutation, full refetch and re-render (no optimistic update).
  - No table or form skeleton.
- **Storefront layout**
  - Customer + cart + listCartOptions block first paint for all (main) pages.
  - No progressive rendering (layout shell first, then data).
- **Product listing**
  - `listProductsWithSort` fetches 100 products then sorts in memory and paginates; wasteful and does not scale to 50k.
  - Every store/category/collection page that uses sort triggers this.
- **Backend**
  - No cache for products, regions, collections, categories → DB hit on every cache miss or revalidation.
  - At 10k concurrent storefront users, product/region/collection APIs become bottleneck.
- **Search**
  - Storefront header search is placeholder only (no API, no debounce).
- **Admin product list (Medusa)**
  - We don’t control it; 50k products depend on Medusa’s pagination and virtualization (if any).
- **Account area**
  - Spinner instead of skeleton for account/dashboard loading.
- **Banner/product freshness**
  - Backend invalidation is in place for banners; storefront may still show stale for up to Next revalidate (60s) unless we add on-demand revalidation.

---

## 3. Admin UI Preloading & Smoothness Plan

**Constraint:** We do not control the Medusa Admin shell or core list/detail pages. The plan applies to **what we own** (Hero Banners and any future custom routes) and **recommendations** for Medusa-level behavior.

### 3.1 Persistent App Shell

- **Reality:** Shell (sidebar + header) is Medusa’s; it renders once per SPA load. We cannot change its implementation.
- **Recommendation:** Ensure custom routes (e.g. Hero Banners) do not force a full SPA reload; use client-side navigation so the shell stays mounted. Already the case for our route.
- **Our pages:** Keep a single content area that updates; avoid full-page replacement.

### 3.2 Route-Level Prefetching

- **Reality:** Medusa Admin routing is internal; we don’t control prefetch.
- **Our side:** For Hero Banners, we can **prefetch** `/admin/hero-banners` as soon as the app (or sidebar) mounts, or on hover of the “Hero Banners” nav item if the framework exposes it, so that when the user clicks, data is already in memory or in a client cache (e.g. React Query with staleTime).

### 3.3 Optimistic Navigation

- **Login:** Medusa handles redirect; our login widget keeps button visible during loading. No change needed for “instant” redirect; that’s Medusa’s flow.
- **Menu clicks:** Our Hero Banners route should switch **instantly** (client-side). If we prefetch data, the content area can show cached data immediately and revalidate in the background.

### 3.4 Replace Spinners with Skeleton Loaders (our pages)

- **Hero Banners:** Replace the single "Loading..." paragraph with:
  - A **table skeleton** (rows × columns matching the table) and, if the form is shown by default, a **form skeleton** (fields + buttons).
  - So the user sees structure immediately; data fills in when the request completes.

### 3.5 Progressive Rendering (our pages)

- **Hero Banners:** Render layout (heading + “Create Banner” button + table header) immediately; keep a skeleton in the table body until data arrives. Optionally show “Create” form as a drawer/modal so the main table is visible while editing.

### 3.6 Keep Data Warm in Memory

- **Our route:** Use a client cache (e.g. React Query, SWR) for `/admin/hero-banners` with a short `staleTime` (e.g. 30s) and `refetchOnWindowFocus` or silent revalidation so repeat visits don’t show loading again and data stays fresh.

### 3.7 Virtualized Tables for Large Lists (50k products)

- **Reality:** The **product list** (50k) is Medusa’s. If Medusa doesn’t virtualize, we can only recommend or contribute upstream.
- **Our Hero Banners:** List is small; virtualization not needed. If we add other list routes with many rows, use a virtualized table (e.g. TanStack Virtual) and server-side pagination (e.g. 20–50 rows per page).

### 3.8 Debounced Search (our pages)

- **Our Hero Banners:** No search today. If we add a filter/search, debounce input (e.g. 300ms) and query the backend with a delay to avoid excessive requests.

### 3.9 Loading-State Bugs (buttons must not disappear)

- **Our pages:** For Create/Update/Delete/Toggle/Reorder, keep buttons **visible** and disabled during request; show spinner or loading state next to the label (same pattern as login). Never hide the button or replace it with only a spinner unless the design explicitly keeps the same hit area.

---

## 4. Redis Caching & Invalidation Strategy

### 4.1 Current State

- **Configured:** Caching module with Redis provider when `CACHE_REDIS_URL` is set; used only for **store hero-banners** (key `hero_banners:active`, TTL 300s).
- **Invalidation:** Admin hero-banner create/update/delete/batch call `invalidateHeroBannersCache(scope)` after success.

### 4.2 Recommended Extension (no code here)

- **Store products (list):** Cache by **query signature** (e.g. hash of region_id, limit, offset, category_id, collection_id, order). TTL short (e.g. 60–120s). Invalidate on product create/update/delete (via Medusa subscriber or webhook) for affected keys or a tag pattern (e.g. `products:*`).
- **Store regions:** Cache key e.g. `regions:list`; TTL long (e.g. 3600). Invalidate rarely (region.updated if needed).
- **Store collections/categories:** Same idea: cache list/list-by-handle with short TTL; invalidate on collection/category update.
- **Golden rule:** **API must NOT hit DB on every request** for these read-heavy, mostly public endpoints. Cache-first; DB as fallback. Invalidation on admin mutations keeps freshness (1–2s goal).

### 4.3 Invalidation Matrix

| Resource | Cache key / pattern | Invalidate on |
|----------|---------------------|----------------|
| Hero banners | `hero_banners:active` | Already: admin banner create/update/delete/batch. |
| Products | e.g. `products:${hash(query)}` or tag `products:*` | product.updated / product.deleted (subscriber or Medusa hook). |
| Regions | `regions:list` (optional) | region.updated (rare). |
| Collections | e.g. `collections:list`, `collection:${handle}` | collection.updated. |
| Categories | e.g. `categories:top`, `categories:tree` | product_category.updated. |

---

## 5. Product Listing & Search Optimization Plan

### 5.1 Storefront Listing (our code)

- **Remove fetch-100-then-sort:** Stop using `listProductsWithSort` as implemented today. Use **server-side** behavior only:
  - Pass **limit** and **offset** (or cursor if Medusa supports it) for the current page.
  - Pass **order** (or equivalent) for `created_at` when possible in Medusa store API.
  - For **price** sort: if Medusa store API does not support sort by price, options are (a) accept created_at-only server-side and do price sort in a separate endpoint that uses DB ordering, or (b) keep a limited client-side sort but only for the **current page** (e.g. 12 items), not 100. Prefer (a) or Medusa-native support.
- **Single request per page:** One `/store/products` call per page with correct limit/offset and order; no 100-product fetch, no in-memory sort of large arrays.
- **Pagination:** Enforce a max page size (e.g. 20–50); document and use consistently.

### 5.2 Storefront Search

- **Implement search:** Wire header search to an API:
  - Either Medusa store search (if available) or a custom store route that queries products (e.g. by title, handle, tag) with **indexed** columns and **limit** (e.g. 20).
  - **Debounce** input (e.g. 300ms) to avoid one request per keystroke.
  - Show results in a dropdown or redirect to a search results page with query params; keep results paginated.

### 5.3 Admin Product Management (50k+ products)

- **Ownership:** Product list is Medusa’s. Rely on:
  - **Server-side pagination** (20–50 rows per page).
  - **Indexed search** (Medusa admin API + DB indexes on title, handle, etc.).
  - **Cursor or offset pagination** in the API.
- **Bulk upload:** If Medusa supports CSV/Excel import, use it as a background job (queue) so the UI is non-blocking and shows progress. If we add custom bulk upload, same pattern: async job + progress indicator.
- **Optimistic UI:** For single product create/update in admin, optimistic update in the list (if we ever extend the product UI) reduces perceived lag.

---

## 6. Real-Time Usage Plan (Admin Only)

- **Use WebSockets (e.g. Socket.IO) only for admin:** Not for storefront.
- **Events:** Emit on backend: `banner.updated`, `product.updated`, `order.updated` (and optionally `collection.updated`, `category.updated` if we cache them).
- **Who listens:** Only **authenticated admin** clients (one connection per tab/session). Payloads minimal (e.g. `{ id, action }`).
- **Effect:** Admin UI can refetch the affected list or update local state so that open list/detail views reflect changes within 1–2s without refresh.
- **Implementation:** Backend: after admin mutations (our hero-banner routes; Medusa subscribers for product/order), emit to an admin-only channel. Admin SPA: connect to the socket on mount; subscribe to events; refetch or invalidate cache for the relevant list. See `docs/WEBSOCKET_ADMIN_PLAN.md` for outline.
- **Lightweight:** No storefront WebSockets; no MQTT/WebRTC.

---

## 7. Expected Performance Improvements

| Change | Before | After |
|--------|--------|--------|
| **Store hero-banners** | Already cache-first + invalidation. | No change; already good. Optionally add storefront tag revalidation for 1–2s global visibility. |
| **Store product listing** | 100-product fetch + in-memory sort per page. | Single request per page with limit/offset + server order; lower latency, lower DB and memory; scales to 50k. |
| **Store products/regions/collections (backend)** | DB on every request. | Cache-first with short TTL + invalidation; most requests served from Redis; DB load drops sharply at 10k users. |
| **Admin Hero Banners** | Blank "Loading...", blocking refetch after every mutation. | Skeleton table/form; optimistic updates; prefetch + client cache; buttons stay visible during loading. |
| **Storefront layout** | Customer + cart block first paint. | Optionally: show shell first (e.g. Nav + placeholder), load customer/cart in parallel or after first paint; or at least ensure these calls are fast (backend cache for regions, etc.). |
| **Search** | None. | Debounced search against indexed API; predictable, fast results. |
| **Admin real-time** | Manual refresh. | WebSocket events for banner/product/order; admin sees updates in 1–2s without refresh. |

**Summary:** With Redis for store products/regions/collections, server-side product listing, admin skeletons + optimistic UI + prefetch, and optional WebSockets for admin, we get: (1) **Storefront** ready for ~10k concurrent users with fast first paint and no DB hit on every request; (2) **Admin** that feels instant and preloaded for our custom pages; (3) **Product/banner updates** visible in 1–2s with cache invalidation and optional real-time for admin; (4) **50k products** manageable with server-side pagination and indexed search (Medusa + our store listing fix). No overengineering; production-ready, maintainable design.
