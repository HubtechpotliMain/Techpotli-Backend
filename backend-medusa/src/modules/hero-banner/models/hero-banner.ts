import { model } from "@medusajs/framework/utils"

/**
 * Hero Banner Data Model
 * Represents a hero banner displayed on the storefront homepage
 */
const HeroBanner = model.define("hero_banner", {
  id: model.id().primaryKey(),
  // optional (per spec)
  title: model.text().nullable(),
  // required (per spec) - URL stored in R2, never stored as blob/base64 in DB
  image_url: model.text(),
  redirect_url: model.text().nullable(),
  is_active: model.boolean().default(true),
  sort_order: model.number().default(0),
})

export default HeroBanner
