import "dotenv/config"

import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import fs from "fs"
import path from "path"

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

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
      // Provide safe defaults for local development so the server can boot
      // even if these env vars aren't set yet.
      storeCors: process.env.STORE_CORS || "http://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:9000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
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
