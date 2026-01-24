import { MedusaService } from "@medusajs/framework/utils"
import HeroBanner from "./models/hero-banner"

/**
 * Hero Banner Module Service
 * Handles all business logic for hero banner management
 */
class HeroBannerService extends MedusaService({
  HeroBanner,
}) {
  /**
   * List all hero banners (admin use)
   * @returns Array of hero banners sorted by sort_order
   */
  async listAdminBanners() {
    return await this.listHeroBanners({}, {
      order: { sort_order: "ASC" },
    })
  }

  /**
   * List active banners for storefront (public use)
   * Returns only active banners sorted by sort_order ASC
   * @returns Array of active hero banners
   */
  async listActiveBanners() {
    return await this.listHeroBanners(
      { is_active: true },
      {
        order: { sort_order: "ASC" },
      }
    )
  }

  /**
   * Create a new hero banner
   * @param data - Banner data
   * @returns Created hero banner
   */
  async createBanner(data: {
    title?: string | null
    image_url: string
    redirect_url?: string | null
    is_active?: boolean
    sort_order?: number
  }) {
    // Auto-set sort_order if not provided (place at end)
    if (data.sort_order === undefined) {
      const banners = await this.listAdminBanners()
      const maxSortOrder = banners.length > 0
        ? Math.max(...banners.map((b: any) => b.sort_order || 0))
        : -1
      data.sort_order = maxSortOrder + 1
    }

    return await this.createHeroBanners(data)
  }

  /**
   * Update an existing hero banner
   * @param id - Banner ID
   * @param data - Update data
   * @returns Updated hero banner
   */
  async updateBanner(
    id: string,
    data: {
      title?: string | null
      image_url?: string
      redirect_url?: string | null
      is_active?: boolean
      sort_order?: number
    }
  ) {
    const updateData: any = { id, ...data }
    updateData.updated_at = new Date()

    return await this.updateHeroBanners(updateData)
  }

  /**
   * Delete a hero banner
   * @param id - Banner ID
   */
  async deleteBanner(id: string) {
    return await this.deleteHeroBanners([id])
  }

  /**
   * Toggle banner active status
   * @param id - Banner ID
   * @param isActive - New active status
   * @returns Updated hero banner
   */
  async toggleActive(id: string, isActive: boolean) {
    return await this.updateBanner(id, { is_active: isActive })
  }

  /**
   * Reorder banners
   * Updates sort_order for multiple banners
   * @param orders - Array of { id, sort_order } pairs
   * @returns Updated banners in new order
   */
  async reorderBanners(orders: Array<{ id: string; sort_order: number }>) {
    const updatePromises = orders.map(({ id, sort_order }) =>
      this.updateBanner(id, { sort_order })
    )

    await Promise.all(updatePromises)
    
    return await this.listAdminBanners()
  }
}

export default HeroBannerService
