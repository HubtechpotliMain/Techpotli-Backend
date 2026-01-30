import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getAdminLandingHtml } from "./views/admin-landing";

/**
 * GET / — Techpotli Admin landing page (entry point for admin users only).
 * Public, informational. No auth, no DB, no heavy middleware. Sub-100ms.
 * CTA "Login to Dashboard" redirects to /app (Medusa Admin).
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60");
  res.status(200).send(getAdminLandingHtml());
}
