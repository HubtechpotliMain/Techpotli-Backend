import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getAdminLandingHtml } from "../views/admin-landing";

/**
 * GET /home — Techpotli Admin landing page.
 * Used because Medusa's route sorter drops matcher "/" (empty segments).
 * Root "/" redirects here via src/api/middlewares.ts.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60");
  res.status(200).send(getAdminLandingHtml());
}
