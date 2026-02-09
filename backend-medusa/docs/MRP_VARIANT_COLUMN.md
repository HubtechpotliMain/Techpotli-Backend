# MRP (Original Price) — Variants Tab Column (Dashboard Patch)

## Overview

A **patch** to `@medusajs/dashboard` adds an **MRP (Original Price)** column to the product create **Variants** tab pricing grid. The column appears next to Selling Price columns, stores values in variant metadata in smallest unit, and shows a soft warning when MRP is less than Selling Price.

- **Where:** Product create page → Variants tab → DataGrid (next to Selling Price columns).
- **Label:** "MRP (Original Price)" (per currency/region via `fields.mrpPriceTemplate` in project i18n).
- **Storage:** `variant.metadata.compare_at_prices[currency_code]` in **smallest unit** (e.g. INR: paise, USD: cents). Input is in major units (e.g. ₹1999); conversion happens in `normalizeVariants()`.
- **No impact on:** `prices[]`, tax, discounts, or checkout. Selling Price remains the final payable price; MRP is display-only and optional.

---

## Patch File

- **Path:** `patches/@medusajs+dashboard+2.12.5.patch`
- **Applied by:** `patch-package` (postinstall: `patch-package`).
- **Modified dashboard files:**
  - `src/routes/products/product-create/constants.ts` — add `compare_at_prices` to variant schema.
  - `src/routes/products/product-create/utils.ts` — persist MRP in `metadata.compare_at_prices` in smallest unit; `normalizeVariants()` and `decorateVariantsWithDefaultValues()` updated.
  - `src/routes/products/product-create/components/product-create-variants-form/product-create-variants-form.tsx` — MRP columns (currency + region), `MRPCell` with warning when MRP < Selling Price, `form`/`control` passed into `useColumns`.
  - `src/components/data-grid/helpers/create-data-grid-price-columns.tsx` — (existing) tax tooltip for Selling Price.

---

## Behaviour

1. **Columns:** One MRP column per currency and per region (same order as Selling Price), immediately after the Selling Price columns.
2. **Input:** Number, currency-aware (same `DataGrid.CurrencyCell` as price). User enters major units (e.g. 1999); stored as 199900 in metadata.
3. **Validation:** If MRP < Selling Price for that currency/region, a warning hint is shown in the cell: "MRP is less than Selling Price. You can still save." Save is **not** blocked.
4. **Submit:** `normalizeVariants()` keeps `prices[]` unchanged and adds `metadata: { compare_at_prices: { [currency_code]: amountInSmallestUnit } }` when MRP is set.

---

## Revalidation on Medusa Upgrades

This is a **dashboard patch**. When you upgrade `@medusajs/dashboard` (e.g. 2.12.5 → 2.13.x):

1. **Re-apply the patch:** After `npm install`, run `npx patch-package` (or rely on postinstall). If the patch fails (e.g. "patch failed" or conflicts), the dashboard source was changed upstream.
2. **Inspect failures:** Use the paths listed above and compare with the new dashboard version. Resolve conflicts or re-implement the same behaviour in the new files.
3. **Recreate the patch if needed:** If you fix conflicts manually in `node_modules/@medusajs/dashboard`, run `npx patch-package @medusajs/dashboard` to regenerate the patch (may require a clean repo or fixing line endings if you see git warnings).
4. **Test:** Create a product, set Selling Price and MRP on the Variants tab, save, and confirm `variant.metadata.compare_at_prices` and storefront behaviour.

---

## Safety

- **No backend schema changes:** Only dashboard UI and create-flow payload (variant `metadata`) are touched.
- **No pricing engine changes:** MRP is not in `prices[]` and is not used for tax, discounts, or checkout.
- **Project i18n:** `fields.mrpPriceTemplate` and pricing hints live in `src/admin/i18n/json/en.json`; no edits inside `node_modules` for labels.

---

## Storefront

- **Selling price:** `variant.calculated_price.calculated_amount` (tax inclusive when so configured).
- **MRP:** `variant.metadata?.compare_at_prices?.[currency_code]` (smallest unit). Request `*variants.metadata` in store API fields.
- Use MRP for crossed/original price and selling price as the main payable price.
