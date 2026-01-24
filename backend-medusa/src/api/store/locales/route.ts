import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * Store API route for locales
 * Returns available locales for the storefront
 * 
 * Note: Medusa v2 doesn't have built-in locale management,
 * so this endpoint returns an empty array by default.
 * You can extend this to return locales from your database or configuration.
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  // Return empty locales array
  // You can extend this to fetch from database or config if needed
  res.json({
    locales: [],
  });
}
