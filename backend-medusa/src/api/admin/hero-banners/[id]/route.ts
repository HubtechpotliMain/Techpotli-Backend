import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HERO_BANNER_MODULE } from "../../../../modules/hero-banner"
import HeroBannerService from "../../../../modules/hero-banner/service"
import { invalidateHeroBannersCache } from "../../../../utils/cache-invalidation"

/**
 * GET /admin/hero-banners/:id
 * Get a single hero banner by ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const heroBannerService: HeroBannerService = req.scope.resolve(
      HERO_BANNER_MODULE
    )

    const { id } = req.params

    try {
      const banner = await heroBannerService.retrieveHeroBanner(id)

      if (!banner) {
        res.status(404).json({ message: "Hero banner not found" })
        return
      }

      res.json({ banner })
    } catch (error: any) {
      // Medusa's retrieveHeroBanner may throw if not found
      if (error?.code === "NOT_FOUND" || error?.message?.includes("not found")) {
        res.status(404).json({ message: "Hero banner not found" })
        return
      }
      // Re-throw to outer catch for other errors
      throw error
    }
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch hero banner",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * PATCH /admin/hero-banners/:id
 * Update a hero banner
 * Supports: title, image_url, redirect_url, is_active, sort_order
 * Toggle active: PATCH with { is_active: false/true }
 */
export async function PATCH(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const heroBannerService: HeroBannerService = req.scope.resolve(
      HERO_BANNER_MODULE
    )

    const { id } = req.params
    const { title, image_url, redirect_url, is_active, sort_order } = req.body as {
      title?: string | null
      image_url?: string
      redirect_url?: string | null
      is_active?: boolean
      sort_order?: number
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (image_url !== undefined) updateData.image_url = image_url
    if (redirect_url !== undefined) updateData.redirect_url = redirect_url
    if (is_active !== undefined) updateData.is_active = is_active
    if (sort_order !== undefined) updateData.sort_order = sort_order

    // Validate that at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        message: "No fields provided for update",
      })
      return
    }

    const banner = await heroBannerService.updateBanner(id, updateData)

    await invalidateHeroBannersCache(req.scope)
    res.json({ banner })
  } catch (error) {
    res.status(500).json({
      message: "Failed to update hero banner",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * DELETE /admin/hero-banners/:id
 * Delete a hero banner
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const heroBannerService: HeroBannerService = req.scope.resolve(
      HERO_BANNER_MODULE
    )

    const { id } = req.params

    await heroBannerService.deleteBanner(id)

    await invalidateHeroBannersCache(req.scope)
    res.status(200).json({ message: "Hero banner deleted successfully" })
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete hero banner",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
