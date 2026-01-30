import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { HERO_BANNERS_CACHE_KEY } from "../../../utils/cache-invalidation"
import { HERO_BANNER_MODULE } from "../../../modules/hero-banner"
import HeroBannerService from "../../../modules/hero-banner/service"

const CACHE_TTL = 300 // 5 minutes

/**
 * GET /store/hero-banners
 * Public endpoint to fetch active hero banners for storefront.
 * Cache-first: reads from Redis when CACHE_REDIS_URL is set; on miss, hits DB and populates cache.
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=600"
    )

    // Try cache first (when Caching module is registered)
    try {
      const caching = req.scope.resolve(Modules.CACHING)
      const cached = await caching.get({ key: HERO_BANNERS_CACHE_KEY })
      if (cached != null && Array.isArray(cached)) {
        res.json({
          banners: cached,
          count: cached.length,
        })
        return
      }
    } catch {
      // No Caching module (e.g. no Redis) — fall through to DB
    }

    const heroBannerService: HeroBannerService = req.scope.resolve(
      HERO_BANNER_MODULE
    )
    const banners = await heroBannerService.listActiveBanners()

    // Populate cache for next time
    try {
      const caching = req.scope.resolve(Modules.CACHING)
      await caching.set({
        key: HERO_BANNERS_CACHE_KEY,
        data: banners,
        ttl: CACHE_TTL,
      })
    } catch {
      // ignore
    }

    res.json({
      banners,
      count: banners.length,
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch hero banners",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
