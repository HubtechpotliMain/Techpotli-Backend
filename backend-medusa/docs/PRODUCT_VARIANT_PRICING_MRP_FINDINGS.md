# Product Variant Pricing — compare_at_price / MRP Findings

**Scope:** Medusa Admin product create flow (`/app/products/create` → Variants → Pricing).  
**Goal:** Support "Original Price (MRP)" and "Selling Price" without changing backend logic.

---

## 1. Does the ProductVariant model support compare_at_price?

**No.** In Medusa v2, **product variant prices** in the Admin API do **not** include `compare_at_price` or any MRP/original-price field.

### Evidence

- **Admin API payload types** (`@medusajs/types` → `http/product/admin/payloads.d.ts`):
  - `AdminCreateProductVariantPrice` has only: `currency_code`, `amount`, `min_quantity`, `max_quantity`, `rules`.
  - There is no `compare_at_amount`, `compare_at_price`, or similar field.

- **Admin Price entity** (`http/pricing/admin/entities.d.ts`): `AdminPrice` has `id`, `title`, `currency_code`, `amount`, `raw_amount`, `min_quantity`, `max_quantity`, `price_set_id`, timestamps. No compare-at field.

- **Product create flow:** `normalizeVariants()` in the dashboard maps form `variant.prices` (record of currency/region key → amount) to `prices: { currency_code, amount, rules? }[]`. Only one amount per currency/region is sent.

### Where compare_at *does* exist

- **Line items (cart / order / draft order):** `compare_at_unit_price` exists on:
  - Cart line items, order line items, draft order line items, order edit items.
- So “compare at” is a **cart/order-level** concept (e.g. for display on checkout), not a **stored product variant price** in the Admin API.

### Store API “original” vs “calculated”

- The **store** product variant response can include `calculated_price` with:
  - `calculated_amount` (selling price),
  - `original_amount` (base price when a price list is applied).
- That **original_amount** comes from the **pricing engine** when a price list (e.g. type `sale`) overrides the default price. It is not a separate “MRP” field stored on the variant; it’s derived from price list logic.

---

## 2. How variant prices are stored and sent

- **Admin product create:** Variant prices are sent as:
  ```ts
  prices: { currency_code: string; amount: number; rules?: { region_id: string } | null }[]
  ```
- **Storage:** Handled by the Medusa pricing module (price sets / money amounts). Each variant has a price set; each price has one **amount** per currency/region. There is no second “compare at” amount in the current schema for these prices.

---

## 3. Conclusion and options

- **compare_at_price does not exist** on the ProductVariant pricing model in the Admin API. The product create flow cannot persist “Original Price (MRP)” without backend changes.

**What was implemented:**

- **Selling Price label:** In `src/admin/i18n/json/en.json`, `fields.priceTemplate` is overridden to **“Selling Price {{regionOrCurrency}}”**. The variant pricing grid (and any other admin grid using this key) now shows column headers like “Selling Price (USD)” or “Selling Price (India)” instead of “Price (USD)”.
- **Helper text keys (for future use):** `products.create.pricing.sellingPriceHint` and `products.create.pricing.originalPriceMrpHint` are added in project i18n (“Final price customers pay”, “Shown as crossed price on the website”). The default dashboard product-create flow does not render these keys; they are available for a custom widget or a dashboard patch if you want to show hints next to the pricing section.

**What is not possible without backend work:**

- **Original Price (MRP) field:** Adding a second, persisted “Original Price (MRP)” field in the Admin UI would require:
  1. Extending the Admin API (e.g. `compare_at_amount` or similar on variant price payloads), and
  2. Backend logic to store and return it (and optionally the store API to expose it for the storefront).

**Alternative without changing product variant schema:**

- Use **Price Lists** (type “sale”) to define a lower selling price; the store’s `calculated_price` will then show `calculated_amount` (sale price) and `original_amount` (base price). That gives a “crossed price” experience without an explicit MRP field on the variant.

---

## 4. References

- `node_modules/@medusajs/types/dist/http/product/admin/payloads.d.ts` — `AdminCreateProductVariantPrice`, `AdminCreateProductVariant`
- `node_modules/@medusajs/types/dist/http/pricing/common.d.ts` — `BaseCalculatedPriceSet` (calculated_amount, original_amount)
- `node_modules/@medusajs/dashboard/src/routes/products/product-create/utils.ts` — `normalizeVariants()` mapping form prices to API payload
- Medusa docs: [Product variant prices](https://docs.medusajs.com/resources/storefront-development/products/price), [Sale price example](https://docs.medusajs.com/resources/storefront-development/products/price/examples/sale-price)

---

## 5. Implementation summary (MRP + Selling Price)

- **Admin create (`/app/products/create`) — Variants tab (tab 3):**
  - **Selling Price:** Column headers use `fields.priceTemplate` (overridden in `src/admin/i18n/json/en.json` to **"Selling Price {{regionOrCurrency}}"**), so you see **"Selling Price (INR)"**, **"Selling Price (USD)"**, etc. This is the price the customer pays.
  - **Original Price (MRP):** A **patch** to `@medusajs/dashboard` adds **MRP columns** on the same grid: **"Original Price (MRP) (INR)"**, **"Original Price (MRP) (India)"**, etc. (`fields.mrpPriceTemplate` in project i18n). MRP is stored in **variant.metadata.compare_at_prices** at create time (Admin API accepts variant `metadata`).
  - **Patch:** Changes are in `patches/@medusajs+dashboard+2.12.5.patch`. After `npm install`, run `npx patch-package` (postinstall) to reapply. If the patch fails (e.g. after a dashboard upgrade), re-apply the same edits to the dashboard source in `node_modules` and run `npx patch-package @medusajs/dashboard` to regenerate the patch.
- **Product detail page:** The widget `product-variant-mrp.tsx` (zone product.details.after) still allows editing MRP after create. You can set MRP either on create or on the detail page.
- **Storefront:** When fetching products, include *variants.metadata* in fields. Selling price = variant.calculated_price.calculated_amount. MRP = variant.metadata.compare_at_prices[currencyCode]. Show MRP with strikethrough and selling price next to it (Amazon/Flipkart style).
