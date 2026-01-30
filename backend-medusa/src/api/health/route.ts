import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * GET /health - Used by Railway (and other platforms) for healthchecks.
 * Returns 200 when the HTTP server is up. Does not check DB (keep it fast).
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.status(200).json({ status: "ok" });
}
