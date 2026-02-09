import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Hint, Text } from "@medusajs/ui"

/**
 * Shown on the product list page so admins know:
 * - Selling Price is set on the create page (Variants tab).
 * - MRP (Original Price – for crossed display on website) is set on the product detail page
 *   in the "MRP (Original Price – for crossed display on website)" widget below the main details.
 */
const ProductPricingMrpHintWidget = () => (
  <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle px-4 py-3">
    <Text size="small" className="text-ui-fg-subtle">
      <strong>Pricing:</strong> Set <strong>Selling Price</strong> on the Variants tab when creating or editing.
      After saving, open the product to set <strong>MRP (Original Price – for crossed display on website)</strong> in
      the section below the main details.
    </Text>
  </div>
)

export const config = defineWidgetConfig({
  zone: "product.list.after",
})

export default ProductPricingMrpHintWidget
