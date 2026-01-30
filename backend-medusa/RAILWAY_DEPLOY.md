# Railway deployment

## Healthcheck and start command

- **Healthcheck path:** `/health` — the app exposes `GET /health` (returns 200) for Railway’s healthcheck.
- **Start command:** Use `node scripts/railway-start.js` so the server binds to `0.0.0.0` and uses `PORT`.  
  - A **Procfile** in this directory sets `web: node scripts/railway-start.js`; Nixpacks should use it.  
  - If healthcheck still fails, in Railway go to your service → **Settings** → **Deploy** → set **Start Command** to:  
    `node scripts/railway-start.js`  
  - Ensure **Root Directory** is `backend-medusa` (or the directory that contains `scripts/railway-start.js` and `Procfile`).

## If healthcheck keeps failing

1. **Temporarily disable healthcheck**  
   In Railway: your service → **Settings** → **Deploy** → **Healthcheck Path** → clear it (leave empty) → save.  
   Redeploy. The deployment will then succeed even if the app is not ready.

2. **Check runtime logs**  
   After deploy: **Deployments** → latest deployment → **View Logs** (runtime, not build).  
   Look for:
   - Server listening: `Server is ready on …` or similar
   - Errors: `Database connection failed`, `ECONNREFUSED`, missing env vars, crash on startup

3. **Required env vars in Railway**  
   In **Variables**, set at least:
   - `DATABASE_URL` (Supabase connection string)
   - `JWT_SECRET`
   - `COOKIE_SECRET`
   - `HOST` = `0.0.0.0` (so the app is reachable from Railway’s proxy)

   `PORT` is set by Railway; do not override it.

4. **Re-enable healthcheck**  
   Once the app starts and logs look healthy, set **Healthcheck Path** back to `/health` and redeploy.
