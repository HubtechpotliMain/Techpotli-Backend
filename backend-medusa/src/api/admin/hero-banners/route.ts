import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HERO_BANNER_MODULE } from "../../../modules/hero-banner"
import HeroBannerService from "../../../modules/hero-banner/service"

/**
 * GET /admin/hero-banners
 * List all hero banners (admin)
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const heroBannerService: HeroBannerService = req.scope.resolve(
      HERO_BANNER_MODULE
    )

    const { is_active } = req.query
    const filters: { is_active?: boolean } = {}

    if (is_active !== undefined) {
      filters.is_active = is_active === "true"
    }

    const banners = await heroBannerService.listAdminBanners()

    // Apply is_active filter if provided
    const filteredBanners = filters.is_active !== undefined
      ? banners.filter((b: any) => b.is_active === filters.is_active)
      : banners

    res.json({
      banners: filteredBanners,
      count: filteredBanners.length,
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch hero banners",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * POST /admin/hero-banners
 * Create a new hero banner
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const heroBannerService: HeroBannerService = req.scope.resolve(
      HERO_BANNER_MODULE
    )

    const { title, image_url, redirect_url, is_active, sort_order } = req.body as {
      title?: string
      image_url?: string
      redirect_url?: string | null
      is_active?: boolean
      sort_order?: number
    }

    // Spec: title optional, image_url required
    if (!image_url) {
      res.status(400).json({
        message: "image_url is required",
      })
      return
    }

    const banner = await heroBannerService.createBanner({
      title: title ?? null,
      image_url,
      redirect_url: redirect_url || null,
      is_active: is_active !== undefined ? is_active : true,
      sort_order,
    })

    res.status(201).json({ banner })
  } catch (error) {
    res.status(500).json({
      message: "Failed to create hero banner",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
