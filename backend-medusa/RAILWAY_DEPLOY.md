# Railway deployment

## “Could not find index.html in the admin build directory”

If deploy **build** succeeds but **runtime** crashes with this error, Nixpacks is overwriting the image after `medusa build`, so the admin build is lost. **Use the repo’s Dockerfile instead of Nixpacks:**

1. In Railway: your service → **Settings** → **Build** (or **Deploy**).
2. Set **Builder** to **Dockerfile** (or ensure **Root Directory** is `backend-medusa` so Railway finds `backend-medusa/Dockerfile`).
3. Redeploy. The custom Dockerfile runs `npm run build` and does **not** copy over the app again, so the `.medusa` admin build stays in the image.

If Railway doesn’t show a Builder option, having a **Dockerfile** in the service root (`backend-medusa/`) usually makes Railway use it automatically. Keep **Root Directory** = `backend-medusa`.

## Root URL (/) and admin dashboard

**Root URL redirects to admin:** A `GET /` route redirects to `/app`, so you can share a single URL with your team:

- **Share this:** `https://techpotli-backend-production-3972.up.railway.app/`  
- Anyone opening it is redirected to `/app` (login/dashboard).

You can still use `/app` or `/health` directly.

## “Application failed to respond” when opening the Railway link

If the deploy shows **“Server is ready on port …”** but opening the Railway URL shows **“Application failed to respond”**:

1. **Use the right URL**  
   The root URL `https://YOUR-RAILWAY-URL/` now redirects to `/app`. You can also use:
   - **Health:** `https://YOUR-RAILWAY-URL.up.railway.app/health`
   - **Admin:** `https://YOUR-RAILWAY-URL.up.railway.app/app`

2. **Give Railway a public URL**  
   In Railway: your **backend-medusa** service → **Settings** → **Networking** → **Generate Domain**. Use that URL as the base.

3. **Check runtime logs**  
   If it still fails, open **Deployments** → latest → **View Logs** (runtime) and look for errors when you open the link.

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

## Database connection failing (“Pg connection failed” / “Knex: Timeout acquiring a connection”)

If runtime logs show **Pg connection failed to connect to the database. Retrying...** and then **Knex: Timeout acquiring a connection**, the app cannot reach your PostgreSQL database (e.g. Supabase). Fix the following:

### 1. Set `DATABASE_URL` in Railway

- In Railway: your service → **Variables**.
- Add (or fix) **`DATABASE_URL`**. Railway does **not** use your local `.env`; you must set every variable in the dashboard (or link a env file).
- Value must be a **full Postgres URL** reachable from the internet (e.g. your Supabase connection string).

### 2. Use the correct Supabase connection string

- In **Supabase** → your project → **Settings** → **Database**.
- Under **Connection string**, choose **URI** and copy the URL. Use your **database password** (replace `[YOUR-PASSWORD]`).
- **Required:** add `?sslmode=require` at the end (Supabase requires SSL).  
  Example shape:  
  `postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require`  
  or for **direct** (port 5432):  
  `postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres?sslmode=require`
- Prefer **Session mode** (port **5432**) for Medusa/Knex unless Supabase docs say otherwise for your region. If 5432 keeps timing out, try the **Transaction** pooler (port **6543**) and add `?sslmode=require` (and `pgbouncer=true` if you use the pooler and Supabase recommends it).

### 3. Supabase project not paused (free tier)

- Supabase free tier **pauses** projects after inactivity.
- In Supabase dashboard, if the project is **Paused**, click **Restore**. Wait until it’s running, then redeploy on Railway.

### 4. No typo or wrong variable

- In Railway **Variables**, the name must be exactly **`DATABASE_URL`** (all caps). No extra spaces; value = single line, full URL including `postgresql://...` and `?sslmode=require`.

### 5. Verify from Railway (optional)

- Redeploy after changing variables. Check **View Logs** (runtime). You should see the server start without “Pg connection failed” and eventually “Server is ready on …”.
