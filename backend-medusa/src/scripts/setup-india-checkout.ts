import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateRegionsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * One-time setup script to make guest checkout work for India region:
 * - Ensures the IN region has Razorpay enabled
 * - Ensures a stock location + fulfillment set/service zone exists for "in"
 * - Creates shipping options so checkout can proceed past Delivery step
 *
 * Run:
 *   npx medusa exec ./src/scripts/setup-india-checkout.ts
 */
export default async function setupIndiaCheckout({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const storeModuleService = container.resolve(Modules.STORE)

  const INDIA_ISO2 = "in"
  const INDIA_CURRENCY = "inr"
  const RAZORPAY_PROVIDER_ID = "pp_razorpay_razorpay"
  const DEFAULT_PROVIDER_ID = "pp_system_default"
  const FULFILLMENT_PROVIDER_ID = "manual_manual"

  logger.info("[setup-india-checkout] Starting…")

  // -----------------------------
  // Region (find by country = IN)
  // -----------------------------
  const { data: regions } = await query.graph({
    entity: "region",
    fields: [
      "id",
      "name",
      "currency_code",
      "countries.iso_2",
      "payment_providers.id",
    ],
  })

  const indiaRegion =
    regions?.find((r: any) =>
      (r?.countries || []).some(
        (c: any) => String(c?.iso_2 || "").toLowerCase() === INDIA_ISO2
      )
    ) ||
    regions?.find((r: any) => String(r?.name || "").toLowerCase() === INDIA_ISO2)

  if (!indiaRegion?.id) {
    throw new Error(
      `[setup-india-checkout] No Region found for country '${INDIA_ISO2}'. Create it in Admin → Settings → Regions, then re-run this script.`
    )
  }

  const currentPaymentProviders = (indiaRegion.payment_providers || [])
    .map((p: any) => p?.id)
    .filter(Boolean)

  const desiredPaymentProviders = Array.from(
    new Set([DEFAULT_PROVIDER_ID, ...currentPaymentProviders, RAZORPAY_PROVIDER_ID])
  )

  // Region payment providers are optional for enabling Delivery step.
  // If Razorpay isn't installed/enabled, don't fail the whole setup.
  try {
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: indiaRegion.id },
        update: {
          currency_code: indiaRegion.currency_code || INDIA_CURRENCY,
          payment_providers: desiredPaymentProviders,
        } as any,
      },
    })

    logger.info(
      `[setup-india-checkout] Region updated ${JSON.stringify({
        region_id: indiaRegion.id,
        payment_providers: desiredPaymentProviders,
      })}`
    )
  } catch (e: any) {
    const message = e?.message || String(e)

    logger.warn(
      `[setup-india-checkout] Skipping Razorpay enablement for India region (${message}). Shipping setup will continue.`
    )

    const fallbackProviders = Array.from(
      new Set([DEFAULT_PROVIDER_ID, ...currentPaymentProviders].filter(Boolean))
    )

    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: indiaRegion.id },
        update: {
          currency_code: indiaRegion.currency_code || INDIA_CURRENCY,
          payment_providers: fallbackProviders,
        } as any,
      },
    })

    logger.info(
      `[setup-india-checkout] Region updated (fallback providers) ${JSON.stringify({
        region_id: indiaRegion.id,
        payment_providers: fallbackProviders,
      })}`
    )
  }

  // -----------------------------
  // Sales channel (default)
  // -----------------------------
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })

  if (!defaultSalesChannel.length) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    })
    defaultSalesChannel = result
  }

  // Ensure the store has a default sales channel (helps with availability)
  const [store] = await storeModuleService.listStores()
  if (store?.id && !store.default_sales_channel_id) {
    // Avoid importing updateStoresWorkflow to keep this script lightweight.
    // Most installs already have this set; if not, shipping still works but products may not be visible.
    logger.warn(
      "[setup-india-checkout] Store has no default_sales_channel_id. Consider setting it in Admin → Settings → Store."
    )
  }

  // -----------------------------
  // Stock location (idempotent)
  // -----------------------------
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })

  let stockLocation =
    stockLocations?.find((l: any) => l?.name === "India Warehouse") ||
    stockLocations?.find((l: any) => String(l?.name || "").toLowerCase().includes("india"))

  if (!stockLocation?.id) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "India Warehouse",
            address: {
              city: "Gwalior",
              country_code: "IN",
              address_1: "",
            },
          },
        ],
      },
    })
    stockLocation = (result as any)?.[0]
  }

  if (!stockLocation?.id) {
    throw new Error("[setup-india-checkout] Failed to create/find stock location")
  }

  // Link stock location → fulfillment provider (manual)
  try {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: FULFILLMENT_PROVIDER_ID },
    })
  } catch (e: any) {
    logger.warn(
      `[setup-india-checkout] Failed linking stock location -> fulfillment provider (${FULFILLMENT_PROVIDER_ID}): ${e?.message || e}`
    )
  }

  // Verify provider is enabled for location (required for shipping options creation)
  const [locationCheck] = await remoteQuery({
    entryPoint: "stock_location",
    fields: ["id", "name", "fulfillment_providers.id"],
    variables: { id: [stockLocation.id] },
  })

  const locationProviders =
    (locationCheck?.fulfillment_providers || []).map((p: any) => p?.id).filter(Boolean)

  if (!locationProviders.includes(FULFILLMENT_PROVIDER_ID)) {
    throw new Error(
      `[setup-india-checkout] Fulfillment provider '${FULFILLMENT_PROVIDER_ID}' is not enabled for stock location '${stockLocation.name}'. Enable it in Admin (Locations) or ensure @medusajs/fulfillment-manual is installed.`
    )
  }

  // -----------------------------
  // Fulfillment set + service zone for India
  // -----------------------------
  const { data: fulfillmentSets } = await query.graph({
    entity: "fulfillment_set",
    fields: [
      "id",
      "name",
      "type",
      "service_zones.id",
      "service_zones.name",
      "service_zones.geo_zones.country_code",
    ],
  })

  let fulfillmentSet =
    fulfillmentSets?.find((fs: any) =>
      (fs?.service_zones || []).some((sz: any) =>
        (sz?.geo_zones || []).some(
          (gz: any) => String(gz?.country_code || "").toLowerCase() === INDIA_ISO2
        )
      )
    ) || fulfillmentSets?.find((fs: any) => fs?.name === "India delivery")

  if (!fulfillmentSet?.id) {
    fulfillmentSet = (await fulfillmentModuleService.createFulfillmentSets({
      name: "India delivery",
      type: "shipping",
      service_zones: [
        {
          name: "India",
          geo_zones: [
            {
              country_code: INDIA_ISO2,
              type: "country",
            },
          ],
        },
      ],
    })) as any
  }

  const serviceZoneId =
    fulfillmentSet?.service_zones?.[0]?.id ||
    fulfillmentSet?.service_zones?.find?.((sz: any) =>
      (sz?.geo_zones || []).some(
        (gz: any) => String(gz?.country_code || "").toLowerCase() === INDIA_ISO2
      )
    )?.id

  if (!serviceZoneId) {
    throw new Error("[setup-india-checkout] Missing service zone for India")
  }

  // Link stock location → fulfillment set (availability)
  // In some setups, a fulfillment set can only be linked to one stock location.
  // If the existing India set is already linked elsewhere, create a dedicated one.
  let effectiveFulfillmentSet = fulfillmentSet as any
  let effectiveServiceZoneId: string = serviceZoneId

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: effectiveFulfillmentSet.id },
    })
  } catch (e: any) {
    const message = e?.message || String(e)

    if (message.includes("Cannot create multiple links")) {
      logger.warn(
        `[setup-india-checkout] Fulfillment set already linked elsewhere. Creating a dedicated India fulfillment set for '${stockLocation.name}'.`
      )

      const created = await fulfillmentModuleService.createFulfillmentSets({
        name: `India delivery (${stockLocation.name})`,
        type: "shipping",
        service_zones: [
          {
            name: "India",
            geo_zones: [
              {
                country_code: INDIA_ISO2,
                type: "country",
              },
            ],
          },
        ],
      })

      effectiveFulfillmentSet = created
      const maybeCreatedServiceZoneId =
        created?.service_zones?.[0]?.id ||
        created?.service_zones?.find?.((sz: any) =>
          (sz?.geo_zones || []).some(
            (gz: any) => String(gz?.country_code || "").toLowerCase() === INDIA_ISO2
          )
        )?.id

      if (!maybeCreatedServiceZoneId) {
        throw new Error("[setup-india-checkout] Missing service zone for India (created set)")
      }
      effectiveServiceZoneId = maybeCreatedServiceZoneId as string

      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: effectiveFulfillmentSet.id },
      })
    } else {
      throw e
    }
  }

  // Verify service zone resolves to a fulfillment set with locations + providers
  const [serviceZoneCheck] = await remoteQuery({
    entryPoint: "service_zone",
    fields: ["id", "name", "fulfillment_set.locations.id", "fulfillment_set.locations.fulfillment_providers.id"],
    variables: { id: [effectiveServiceZoneId] },
  })

  const szProviders = (
    serviceZoneCheck?.fulfillment_set?.locations || []
  ).flatMap((l: any) => (l?.fulfillment_providers || []).map((p: any) => p?.id).filter(Boolean))

  if (!szProviders.includes(FULFILLMENT_PROVIDER_ID)) {
    throw new Error(
      `[setup-india-checkout] Service zone is missing fulfillment provider '${FULFILLMENT_PROVIDER_ID}'. Make sure the stock location is linked to the fulfillment set AND the provider is enabled for that location.`
    )
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  })

  // -----------------------------
  // Shipping profile (default)
  // -----------------------------
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null

  if (!shippingProfile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Default Shipping Profile",
            type: "default",
          },
        ],
      },
    })
    shippingProfile = result?.[0]
  }

  if (!shippingProfile?.id) {
    throw new Error("[setup-india-checkout] Failed to create/find shipping profile")
  }

  // -----------------------------
  // Shipping options (create if missing)
  // -----------------------------
  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id", "shipping_profile_id"],
  })

  const hasAnyIndiaOption = (shippingOptions || []).some(
    (so: any) =>
      so?.service_zone_id === effectiveServiceZoneId &&
      so?.shipping_profile_id === shippingProfile.id
  )

  if (!hasAnyIndiaOption) {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Shipping",
          price_type: "flat",
          provider_id: FULFILLMENT_PROVIDER_ID,
          service_zone_id: effectiveServiceZoneId,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Ship in 3-5 days.",
            code: "standard",
          },
          prices: [
            { currency_code: INDIA_CURRENCY, amount: 1000 },
            { region_id: indiaRegion.id, amount: 1000 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
        {
          name: "Express Shipping",
          price_type: "flat",
          provider_id: FULFILLMENT_PROVIDER_ID,
          service_zone_id: effectiveServiceZoneId,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Express",
            description: "Ship in 1-2 days.",
            code: "express",
          },
          prices: [
            { currency_code: INDIA_CURRENCY, amount: 2000 },
            { region_id: indiaRegion.id, amount: 2000 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    })
    logger.info(
      `[setup-india-checkout] Created shipping options for India ${JSON.stringify({
        region_id: indiaRegion.id,
        service_zone_id: effectiveServiceZoneId,
        shipping_profile_id: shippingProfile.id,
      })}`
    )
  } else {
    logger.info(
      `[setup-india-checkout] Shipping options already exist for India ${JSON.stringify({
        region_id: indiaRegion.id,
        service_zone_id: effectiveServiceZoneId,
        shipping_profile_id: shippingProfile.id,
      })}`
    )
  }

  logger.info("[setup-india-checkout] Done.")
}

