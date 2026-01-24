import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HERO_BANNER_MODULE } from "../../../../modules/hero-banner"
import HeroBannerService from "../../../../modules/hero-banner/service"

/**
 * PATCH /admin/hero-banners/batch
 * Batch update hero banners (for reordering)
 * Body: { orders: [{ id: string, sort_order: number }, ...] }
 */
export async function PATCH(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const heroBannerService: HeroBannerService = req.scope.resolve(
      HERO_BANNER_MODULE
    )

    const { orders } = req.body as {
      orders?: Array<{ id: string; sort_order: number }>
    }

    if (!orders || !Array.isArray(orders)) {
      res.status(400).json({
        message: "orders must be an array",
      })
      return
    }

    if (orders.length === 0) {
      res.status(400).json({
        message: "orders array cannot be empty",
      })
      return
    }

    // Validate orders array
    for (const order of orders) {
      if (!order.id || typeof order.id !== "string" || typeof order.sort_order !== "number") {
        res.status(400).json({
          message: "Each order must have id (string) and sort_order (number)",
        })
        return
      }
    }

    const banners = await heroBannerService.reorderBanners(orders)

    res.json({ banners })
  } catch (error) {
    res.status(500).json({
      message: "Failed to reorder hero banners",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
