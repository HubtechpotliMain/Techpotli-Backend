# Railway deployment

## If healthcheck keeps failing

1. **Temporarily disable healthcheck**  
   In Railway: your service → **Deploy** → **Healthcheck Path** → clear it (leave empty) → **Update**.  
   Redeploy. The deployment will then succeed even if the app is not ready.

2. **Check runtime logs**  
   After deploy: **Deployments** → latest deployment → **View Logs** (runtime, not build).  
   Look for:
   - Server listening: `Server is ready on …` or similar
   - Errors: `Database connection failed`, `ECONNREFUSED`, missing env vars, etc.

3. **Required env vars in Railway**  
   In **Variables**, set at least:
   - `DATABASE_URL` (Supabase connection string)
   - `JWT_SECRET`
   - `COOKIE_SECRET`
   - `HOST` = `0.0.0.0` (so the app is reachable from Railway’s proxy)

   `PORT` is set by Railway; do not override it.

4. **Re-enable healthcheck**  
   Once the app starts and logs look healthy, set **Healthcheck Path** back to `/health` and redeploy.

## Start command

The repo uses `node scripts/railway-start.js`, which sets `HOST=0.0.0.0` and then runs `medusa start`, so the server is reachable from Railway.
