import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import path from "path";
import fs from "fs";

/**
 * GET /mn.png — Serve Techpotli logo from public/mn.png for the landing page.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const logoPath = path.join(process.cwd(), "public", "mn.png");
  if (!fs.existsSync(logoPath)) {
    return res.status(404).send("Not found");
  }
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  const stream = fs.createReadStream(logoPath);
  stream.pipe(res);
}
