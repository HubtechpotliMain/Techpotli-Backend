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
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors:
        process.env.AUTH_CORS ||
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000,http://localhost:9000",

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
    // Redis cache for storefront (optional: set CACHE_REDIS_URL in production)
    ...(process.env.CACHE_REDIS_URL
      ? [
          {
            resolve: "@medusajs/medusa/caching",
            options: {
              providers: [
                {
                  resolve: "@medusajs/caching-redis",
                  id: "caching-redis",
                  is_default: true,
                  options: {
                    redisUrl: process.env.CACHE_REDIS_URL,
                    ttl: 300,
                    prefix: "techpotli:",
                    compressionThreshold: 2048,
                  },
                },
              ],
            },
          },
        ]
      : []),
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
    {
      resolve: "./src/modules/hero-banner",
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/payment-razorpay",
            id: "razorpay",
          },
        ],
      },
    },
  ],
})
