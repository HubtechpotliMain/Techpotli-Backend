# MRP (Original Price) — Widget & Storefront

## Overview

MRP is implemented as a **display-only** price using **variant metadata**, not the Medusa pricing engine. This keeps core pricing, tax, and checkout unchanged and upgrade-safe.

- **Admin:** Custom widget on the **product edit (detail)** page. No changes to the pricing grid or to `AdminCreateProductVariantPrice`.
- **Create page:** Medusa does not expose a widget zone on `/app/products/create`. MRP is set **after** creating the product, on the product detail page.
- **Storefront:** Use `variant.calculated_price.calculated_amount` for selling price and `variant.metadata.compare_at_prices[currency_code]` for MRP (crossed).

---

## 1. Admin UI — MRP widget

- **Where:** Product **edit** page (`/app/products/:id`) — section **below** the main details (zone: `product.details.after`).
- **Label:** “MRP (Original Price – for crossed display on website)”.
- **Input:** Number, currency-aware (INR first, then other currencies). Value is stored in **smallest unit** (e.g. INR: paise, USD: cents).
- **Validation:** Soft only. If MRP &lt; Selling Price, a warning is shown; saving is **not** blocked.

### Product create page

- There is **no** widget zone on the product **create** page in the Medusa admin SDK. The only supported approach is:
  1. Create the product and set **Selling Price** on the Variants tab.
  2. After saving, open the product and set **MRP** in the “MRP (Original Price – for crossed display on website)” widget on the detail page.

The **product list** hint widget (`product.list.after`) explains this flow.

---

## 2. Data storage

- **Location:** `variant.metadata.compare_at_prices[currency_code]`.
- **Format:** Integer in **smallest currency unit** (e.g. `199900` = ₹1999.00 for INR).
- **Example:**
  ```json
  {
    "compare_at_prices": {
      "inr": 199900
    }
  }
  ```
- MRP is **not** in `prices[]` and does **not** affect tax, discounts, or checkout.

---

## 3. Submission flow

- **Product create:** Selling price is set via the normal Medusa Variants/Pricing flow. MRP is set **after** create on the product detail page via the MRP widget.
- **Product edit:** MRP is read from `variant.metadata.compare_at_prices` and prefilled; saving updates variant metadata via the widget’s “Save MRP” flow.

---

## 4. Storefront compatibility

- **API:** Request variant metadata so MRP is present. The storefront already uses:
  ```text
  *variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.metadata,...
  ```
- **Selling price (tax inclusive):** `variant.calculated_price.calculated_amount` (smallest unit).
- **MRP (for crossed display):** `variant.metadata?.compare_at_prices?.[currency_code]` (smallest unit).
- **Rendering:** Storefront should show MRP crossed out and selling price highlighted (tax inclusive). No admin UI code is required for that; this doc describes the data contract.

---

## 5. Code organization

- All custom code lives under `src/admin/` (widgets, i18n).
- The MRP widget uses Medusa extension points only; the pricing grid and core types are **not** modified.
- Comments in `src/admin/widgets/product-variant-mrp.tsx` explain why MRP is in metadata and why the grid is unchanged.

---

## 6. Constraints (unchanged)

- Do **not** modify Medusa core pricing schema.
- Do **not** add fields to `AdminCreateProductVariantPrice`.
- Do **not** edit `node_modules/@medusajs/dashboard`.
- Do **not** add a new column to the existing pricing grid.
- Keep existing tax-inclusive and tax-exclusive pricing intact.
