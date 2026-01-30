# Production-Ready Checklist

Summary of changes applied to make the application production-ready (storefront scale, admin UX, caching, search).

## Environment (Production)

Add to backend `.env` for production:

```env
# Redis cache (recommended for 10k+ storefront users)
CACHE_REDIS_URL=redis://your-redis-host:6379
# Or Upstash: redis://default:xxx@xxx.upstash.io:6379
```

- **Without `CACHE_REDIS_URL`:** Backend runs without Redis; store hero-banners fall back to DB on every request.
- **With `CACHE_REDIS_URL`:** Store hero-banners use cache-first reads; admin mutations invalidate cache so updates reflect quickly.

## Implemented

### Backend
- **Redis caching:** Optional Caching module (when `CACHE_REDIS_URL` is set). Store `GET /store/hero-banners` is cache-first; invalidation on admin create/update/delete/batch.
- **Cache invalidation:** `invalidateHeroBannersCache(scope)` called after every admin hero-banner mutation.

### Storefront
- **Product listing:** Server-side pagination (one request per page, limit 12). `created_at` sort uses API `order`; price sort sorts current page only (12 items). No more fetch-100-then-sort.
- **Search:** Header search with 300ms debounce; calls `searchProducts({ query, countryCode })`; dropdown with results and "View all results" → `/store?q=...`. Store page supports `q` for filtered listing.
- **Account loading:** Spinner replaced with skeleton (nav + content blocks) for account and dashboard loading routes.

### Admin
- **Hero Banners:** Table skeleton (5 rows) instead of "Loading..."; optimistic UI for create, update, delete, toggle, reorder (revert on error); refetch on window focus so other tabs’ updates appear when focusing the tab.
- **Buttons:** Buttons stay visible during loading (no disappearing).

### Deferred (documented, not implemented)
- **WebSockets (admin):** Would require attaching Socket.IO to Medusa’s HTTP server (no public hook in current setup). Plan in `docs/WEBSOCKET_ADMIN_PLAN.md`. Refetch-on-focus gives cross-tab updates without WebSockets.
- **Backend cache for products/regions:** Only hero-banners use Redis today. Products/regions can be cached via CDN or by extending Medusa’s query/cache when needed.

## Quick verification

1. **Backend:** Set `CACHE_REDIS_URL` (or leave unset for dev), run `npm run dev`. Create/update a hero banner; call `GET /store/hero-banners` twice — second request should be fast (cache hit when Redis is set).
2. **Storefront:** Open store, change sort, change page — each page should be one API call (12 products). Use header search — dropdown and "View all results" should work.
3. **Admin:** Open Hero Banners — skeleton then table; create/update/delete — UI updates immediately (optimistic); refocus tab after another tab updates — list refetches.

## Docs

- **Architecture & performance:** `docs/PRODUCTION_ARCHITECTURE.md`, `docs/PERFORMANCE_AUDIT_AND_DESIGN.md`
- **WebSocket plan (admin):** `docs/WEBSOCKET_ADMIN_PLAN.md`
