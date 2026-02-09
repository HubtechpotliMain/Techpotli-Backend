/**
 * MRP (Original Price) — Admin widget for product edit page.
 *
 * WHY METADATA: MRP is a display-only "compare at" price for the storefront (crossed out).
 * We do NOT add fields to AdminCreateProductVariantPrice or touch the pricing grid so that
 * Medusa core pricing, tax, and checkout remain unchanged and upgrade-safe.
 *
 * Storage: variant.metadata.compare_at_prices[currency_code] in smallest currency unit
 * (e.g. INR: paise, USD: cents). Storefront uses calculated_price.calculated_amount for
 * selling price and this metadata for crossed MRP.
 */

import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Hint, Input, Label, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"

const API_BASE = "/admin"

/** Decimal places per currency (for display ↔ smallest-unit conversion). INR first, extensible. */
const CURRENCY_DECIMALS: Record<string, number> = {
  inr: 2,
  usd: 2,
  eur: 2,
  gbp: 2,
}

const DEFAULT_DECIMALS = 2

/** Order: INR first, then rest alphabetically. */
function sortCurrencies(codes: string[]): string[] {
  const uniq = [...new Set(codes)]
  const inr = uniq.filter((c) => c.toLowerCase() === "inr")
  const rest = uniq.filter((c) => c.toLowerCase() !== "inr").sort((a, b) => a.localeCompare(b))
  return [...inr, ...rest]
}

function getDecimals(currencyCode: string): number {
  return CURRENCY_DECIMALS[currencyCode.toLowerCase()] ?? DEFAULT_DECIMALS
}

/** Smallest unit → display (e.g. 199900 → "1999"). */
function fromSmallestUnit(amount: number, currencyCode: string): string {
  const decimals = getDecimals(currencyCode)
  const divisor = Math.pow(10, decimals)
  const value = amount / divisor
  return value % 1 === 0 ? String(value) : value.toFixed(decimals)
}

/** Display string → smallest unit (e.g. "1999" → 199900). */
function toSmallestUnit(displayValue: string, currencyCode: string): number | null {
  const num = parseFloat(displayValue)
  if (Number.isNaN(num) || num < 0) return null
  const decimals = getDecimals(currencyCode)
  return Math.round(num * Math.pow(10, decimals))
}

type VariantPrice = { currency_code: string; amount: number; rules?: { region_id: string } }
type Variant = {
  id: string
  title: string
  sku?: string
  prices?: VariantPrice[] | null
  metadata?: Record<string, unknown> | null
}
type Product = { id: string; title: string; variants?: Variant[] }

function useProductWithVariants(productId: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(!!productId)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!productId) {
      setProduct(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    fetch(
      `${API_BASE}/products/${productId}?fields=id,title,*variants,*variants.prices,*variants.metadata`,
      { credentials: "include" }
    )
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
      })
      .then((data) => {
        setProduct(data.product ?? null)
      })
      .catch((e) => {
        setError(e instanceof Error ? e : new Error(String(e)))
        setProduct(null)
      })
      .finally(() => setLoading(false))
  }, [productId])

  return { product, loading, error }
}

function getCompareAtPrices(metadata: Record<string, unknown> | null | undefined): Record<string, number> {
  const raw = metadata?.compare_at_prices
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw).filter(
      (e): e is [string, number] => typeof e[0] === "string" && typeof e[1] === "number"
    )
  )
}

/** Get selling price amount in smallest unit per currency (first price for that currency). */
function getSellingAmountByCurrency(prices: VariantPrice[] | null | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of prices ?? []) {
    if (out[p.currency_code] == null) out[p.currency_code] = p.amount
  }
  return out
}

const MRP_LABEL = "MRP (Original Price – for crossed display on website)"

const ProductVariantMrpWidget = () => {
  const { id: productId } = useParams<{ id: string }>()
  const { product, loading, error } = useProductWithVariants(productId)
  const [localMrp, setLocalMrp] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState(false)

  const variants = product?.variants ?? []

  const setMrpForVariant = useCallback((variantId: string, currencyCode: string, value: string) => {
    setLocalMrp((prev) => ({
      ...prev,
      [variantId]: { ...(prev[variantId] ?? {}), [currencyCode]: value },
    }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!productId) return
    setSaving(true)
    try {
      for (const variant of variants) {
        const pricesByCurrency: Record<string, number> = {}
        const currencies = sortCurrencies((variant.prices ?? []).map((p) => p.currency_code))
        for (const currencyCode of currencies) {
          const raw = localMrp[variant.id]?.[currencyCode]
          const existing = getCompareAtPrices(variant.metadata ?? undefined)
          const prev = existing[currencyCode]
          if (raw !== undefined && raw !== "") {
            const amount = toSmallestUnit(raw, currencyCode)
            if (amount != null) pricesByCurrency[currencyCode] = amount
          } else if (prev !== undefined) {
            pricesByCurrency[currencyCode] = prev
          }
        }
        const existing = getCompareAtPrices(variant.metadata ?? undefined)
        const nextCompareAt = { ...existing, ...pricesByCurrency }
        const metadata = { ...(variant.metadata ?? {}), compare_at_prices: nextCompareAt }

        const res = await fetch(
          `${API_BASE}/products/${productId}/variants/${variant.id}`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ metadata }),
          }
        )
        if (!res.ok) throw new Error(await res.text())
      }
      toast.success("MRP saved. Storefront will show crossed MRP and Selling Price (tax inclusive).")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save MRP")
    } finally {
      setSaving(false)
    }
  }, [productId, variants, localMrp])

  useEffect(() => {
    if (!variants.length) return
    const next: Record<string, Record<string, string>> = {}
    for (const v of variants) {
      const compareAt = getCompareAtPrices(v.metadata ?? undefined)
      const byKey: Record<string, string> = {}
      for (const p of v.prices ?? []) {
        const key = p.currency_code
        const val = compareAt[key]
        if (val != null) byKey[key] = fromSmallestUnit(val, key)
      }
      if (Object.keys(byKey).length) next[v.id] = byKey
    }
    setLocalMrp((prev) => ({ ...next, ...prev }))
  }, [productId, product?.variants?.length])

  if (!productId || loading || error) return null
  if (!variants.length) return null

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{MRP_LABEL}</Heading>
          <p className="text-ui-fg-subtle mt-1 text-sm">
            Display-only price for the website (shown crossed out). Selling price is set in the Variants/Pricing section and is what the customer pays (tax inclusive). We do not modify the pricing grid.
          </p>
        </div>
        <Button size="small" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save MRP"}
        </Button>
      </div>
      <div className="px-6 py-4">
        <div className="flex flex-col gap-6">
          {variants.map((variant) => {
            const prices = variant.prices ?? []
            const currencies = sortCurrencies([...new Set(prices.map((p) => p.currency_code))])
            const sellingByCurrency = getSellingAmountByCurrency(variant.prices)
            return (
              <VariantMrpRow
                key={variant.id}
                variant={variant}
                currencies={currencies}
                localMrp={localMrp[variant.id] ?? {}}
                setMrpForVariant={setMrpForVariant}
                sellingByCurrency={sellingByCurrency}
              />
            )
          })}
        </div>
      </div>
    </Container>
  )
}

function VariantMrpRow({
  variant,
  currencies,
  localMrp,
  setMrpForVariant,
  sellingByCurrency,
}: {
  variant: Variant
  currencies: string[]
  localMrp: Record<string, string>
  setMrpForVariant: (variantId: string, currencyCode: string, value: string) => void
  sellingByCurrency: Record<string, number>
}) {
  return (
    <div className="rounded-lg border border-ui-border-base p-4">
      <Label className="text-medium mb-2 block">
        {variant.title}
        {variant.sku ? ` (${variant.sku})` : ""}
      </Label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {currencies.map((currencyCode) => {
          const displayValue = localMrp[currencyCode] ?? ""
          const mrpSmallest = toSmallestUnit(displayValue, currencyCode)
          const sellingSmallest = sellingByCurrency[currencyCode]
          const showWarning =
            mrpSmallest != null &&
            sellingSmallest != null &&
            sellingSmallest > 0 &&
            mrpSmallest < sellingSmallest
          return (
            <div key={currencyCode}>
              <Label className="text-ui-fg-muted mb-1 block text-xs">
                {MRP_LABEL} — {currencyCode.toUpperCase()}
              </Label>
              <Input
                type="number"
                min={0}
                step={getDecimals(currencyCode) >= 2 ? "0.01" : "1"}
                placeholder="Optional"
                value={displayValue}
                onChange={(e) => setMrpForVariant(variant.id, currencyCode, e.target.value)}
              />
              {showWarning && (
                <Hint className="mt-1" variant="warning">
                  MRP is less than Selling Price. You can still save (client decision).
                </Hint>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductVariantMrpWidget
