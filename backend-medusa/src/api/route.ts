import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * GET / — Redirect to the admin dashboard so the main URL opens the login/dashboard.
 * Share one URL with the team: https://your-backend.up.railway.app/
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.redirect(302, "/app");
}
