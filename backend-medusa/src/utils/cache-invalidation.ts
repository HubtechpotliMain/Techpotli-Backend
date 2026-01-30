/**
 * Cache invalidation for storefront cache-first reads.
 * Uses Medusa Caching Module (Redis when CACHE_REDIS_URL is set).
 * No-op when Caching module is not registered.
 */

import { Modules } from "@medusajs/framework/utils"

const HERO_BANNERS_CACHE_KEY = "hero_banners:active"

export type ScopeLike = {
  resolve<T>(key: string): T
}

/**
 * Invalidates the storefront hero banners cache so the next GET /store/hero-banners
 * will hit the DB and repopulate the cache. Call after admin create/update/delete/batch.
 */
export async function invalidateHeroBannersCache(scope: ScopeLike): Promise<void> {
  try {
    const caching = scope.resolve(Modules.CACHING)
    await caching.clear({ key: HERO_BANNERS_CACHE_KEY })
  } catch {
    // Caching module not registered (e.g. no CACHE_REDIS_URL) — no-op
  }
}

export { HERO_BANNERS_CACHE_KEY }
