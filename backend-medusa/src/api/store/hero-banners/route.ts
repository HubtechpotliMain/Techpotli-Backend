import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HERO_BANNER_MODULE } from "../../../modules/hero-banner"
import HeroBannerService from "../../../modules/hero-banner/service"

/**
 * GET /store/hero-banners
 * Public endpoint to fetch active hero banners for storefront
 * Returns only active banners sorted by sort_order
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const heroBannerService: HeroBannerService = req.scope.resolve(
      HERO_BANNER_MODULE
    )

    const banners = await heroBannerService.listActiveBanners()

    // Cache-friendly headers for storefront
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600")

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
