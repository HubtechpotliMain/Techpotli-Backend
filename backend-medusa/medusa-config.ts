import "dotenv/config"

import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import fs from "fs"
import path from "path"

const NODE_ENV = process.env.NODE_ENV || 'development'
const IS_PROD = NODE_ENV === 'production'

loadEnv(NODE_ENV, process.cwd())

function getRequiredEnv(name, fallback) {
  const value = process.env[name]

  // In production, the variable must be explicitly set
  if (IS_PROD && !value) {
    throw new Error(`[medusa-config] Missing required environment variable in production: ${name}`)
  }

  // In development, allow a safe fallback for easier local setup
  return value || fallback
}

// #region agent log
fetch('http://127.0.0.1:7243/ingest/826fbe81-7786-462b-acfe-96956d881a46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'medusa-config.ts:10',message:'medusa-config loaded',data:{nodeEnv:process.env.NODE_ENV||'development',cwd:process.cwd()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/826fbe81-7786-462b-acfe-96956d881a46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'medusa-config.ts:14',message:'env presence check',data:{hasSupabaseUrl:Boolean(process.env.SUPABASE_URL),hasSupabaseAnonKey:Boolean(process.env.SUPABASE_ANON_KEY),hasSupabaseServiceRoleKey:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),hasBucket:Boolean(process.env.SUPABASE_STORAGE_BUCKET),portEnv:process.env.PORT||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
// #endregion

// #region agent log
(() => { try { const p1=path.join(process.cwd(),'node_modules','@react-aria','dnd','dist','import.mjs'); const p2=path.join(process.cwd(),'node_modules','@react-aria','dnd','dist','utils.mjs'); fetch('http://127.0.0.1:7243/ingest/826fbe81-7786-462b-acfe-96956d881a46',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'medusa-config.ts:18',message:'@react-aria/dnd file presence',data:{importMjsExists:fs.existsSync(p1),utilsMjsExists:fs.existsSync(p2)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{}); } catch { } })();
// #endregion

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      // CORS is applied separately for store/admin/auth routes.
      // Tight defaults for local development; override via env in production:
      //   STORE_CORS="https://store.yourdomain.com"
      //   ADMIN_CORS="https://admin.yourdomain.com"
      //   AUTH_CORS="https://store.yourdomain.com,https://admin.yourdomain.com"
      // IMPORTANT (dev):
      // - Next.js dev server defaults to http://localhost:3000
      // - Vite often uses http://localhost:5173
      // Include both + 127.0.0.1 variants to avoid CORS preflight failures.
      storeCors:
        process.env.STORE_CORS ||
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors:
        process.env.AUTH_CORS ||
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:9000",

      // JWT and cookie secrets:
      // - In production: MUST be provided via env and be long, random strings.
      // - In development: fall back to local-only defaults.
      jwtSecret: getRequiredEnv("JWT_SECRET", "supersecret"),
      cookieSecret: getRequiredEnv("COOKIE_SECRET", "supersecret"),
    },
    // Cookie security:
    // - httpOnly: always true (cookies not readable from JS).
    // - secure: only sent over HTTPS in production.
    // - sameSite: "none" in production for cross-origin admin/frontend, "lax" in dev.
    cookieOptions: {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? "none" : "lax",
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "./src/file-providers/r2-storage",
            id: "r2",
          },
        ],
      },
    },
  ],
})
