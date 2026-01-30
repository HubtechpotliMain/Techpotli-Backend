# Deployment Platform Comparison (~10k Concurrent Users)

Stack: **Supabase** (DB) + **Vercel** (Next.js storefront) + **Cloudflare R2** (images).  
Backend (Medusa) hosting options below.  
*Approx. conversion: $1 ≈ ₹90.*

---

## Best for your setup: Supabase + Resend

You are using **Supabase** for the database and **Resend** for emails (verification + any transactional). Your backend already uses them via `DATABASE_URL`, `RESEND_API_KEY`, and `EMAIL_FROM`.

### Recommendation: **Railway** (best fit)

| Why Railway | Details |
|-------------|--------|
| **Uses your stack as-is** | Connects to existing Supabase DB and Resend; no need to switch DB or email provider. |
| **Resend stays** | Your `EmailVerificationServiceImpl` and subscriber already use Resend; set `RESEND_API_KEY` and `EMAIL_FROM` on Railway and it works. |
| **Cost** | Backend only ~₹4,500–9,000/mo at ~10k users; no extra fee for Medusa DB or Medusa Emails you wouldn’t use. |
| **Control** | You keep Supabase, R2, Resend, and add Redis (e.g. Upstash) when you need caching. |
| **Deploy** | Git → Railway, root `backend-medusa`, env vars from below; use `RAILWAY_DEPLOY.md` for healthcheck and start command. |

**Alternative:** **DigitalOcean App Platform** – Same idea (your Supabase + Resend), slightly different UI and pricing (~₹3,600–7,200/mo). Good if you prefer DO’s dashboard.

**When to consider Medusa Cloud instead:** If you want the least ops (GitHub → deploy, Medusa-tuned servers, PR previews) and are okay using **Medusa’s included Postgres + Redis + Medusa Emails** instead of Supabase + Resend. Then you’d migrate DB to Medusa Cloud and switch emails to Medusa Emails. For “keep Supabase + Resend,” Railway is the better fit.

### Why we're not choosing Medusa Cloud

| Reason | Details |
|--------|--------|
| **1. Database switch** | Medusa Cloud uses **its own Postgres**. We want to keep **Supabase** as our database. Choosing Medusa Cloud would mean migrating from Supabase to Medusa's DB — extra work, risk, and losing Supabase features (e.g. Realtime, Auth if we use them). |
| **2. Email provider** | We use **Resend** and already have it integrated. Medusa Cloud includes **Medusa Emails**. We'd either switch to Medusa Emails (redundant work) or pay for a plan that includes email we don't use. |
| **3. Company size & risk** | **Medusa** (the company) is smaller: ~$8M seed, ~11–50 employees. **Supabase** is larger: ~$396M+ funding, 100–250+ employees, $2B valuation. Keeping our **database** with Supabase (bigger, dedicated DB/infra company) is lower risk than moving it to Medusa's included DB. |
| **4. Vendor lock-in** | Putting our primary data on Medusa Cloud ties us to one vendor for both app and DB. With **Railway + Supabase**, the database is with Supabase; we can change backend host (Railway → AWS/GCP) later without a DB migration. |
| **5. Cost** | Medusa Cloud Pro (~₹27k/mo) includes DB + Redis + emails we're not using. **Railway + Supabase + Resend** is ~₹9k–15k/mo and we keep full control of each piece. |
| **6. Email limits not enough** | Medusa Cloud **Hobby**: 3,000 emails/month, 100/day – **not enough for a real company** (order confirmations, verification, marketing, seller notifications add up fast). **Pro**: 25k/month, 1,500/day (then $0.7/1k) – better but still capped. With **Resend** we scale with usage and aren’t tied to plan limits. |

**Summary:** We're not choosing Medusa Cloud because we want to **keep Supabase as our database** and **Resend for emails**, avoid DB migration and vendor lock-in, prefer a larger infra provider (Supabase) for our data, and need **email volume** that Medusa Cloud’s limits (3k/100) don’t support. Railway (or DO) for the backend fits that choice.

### Medusa Cloud: can you use another email? Can you switch DB to AWS later?

**1. Using another email service on Medusa Cloud**

- On Medusa Cloud, **Medusa Emails** is the default and the docs say to **remove** other notification providers (e.g. SendGrid/Resend) to use Medusa Emails.
- Medusa Cloud also reserves env vars like **`MEDUSA_CLOUD_EMAILS_ENDPOINT`** – the platform controls the email path.
- So in practice: **you cannot use Resend (or another email service) on Medusa Cloud.** You use **Medusa Emails** only. If you want Resend, you host the backend elsewhere (e.g. Railway).

**2. Switching database from Medusa Cloud to AWS later**

- Medusa Cloud **reserves `DATABASE_URL`** – you cannot set or override it. The app always uses Medusa’s managed Postgres.
- So **you cannot stay on Medusa Cloud and point at AWS RDS (or Supabase).** “Medusa Cloud app + external DB” is not supported.
- **You can still switch to AWS (or any other DB) later**, but that means **leaving Medusa Cloud**:
  1. **Export** your data (Medusa Cloud supports database dump export).
  2. **Set up** AWS RDS (or Supabase, etc.) and **import** the dump.
  3. **Deploy your app** somewhere else (e.g. Railway, AWS ECS) and set **`DATABASE_URL`** to the new database.
- So: **you can switch DB**, but only by **migrating off Medusa Cloud** (app + DB). You are not locked in forever – you can export and leave – but you cannot have “Medusa Cloud hosting + AWS (or Supabase) database” at the same time.

| Question | Answer |
|----------|--------|
| Can I use Resend (or another email) on Medusa Cloud? | **No.** You use Medusa Emails only. |
| Can I switch from Medusa’s DB to AWS RDS later? | **Yes**, by exporting the DB, importing into AWS RDS, and moving the app off Medusa Cloud (e.g. Railway/AWS). You cannot stay on Medusa Cloud and point at AWS. |

---

### Env vars to set on the backend host (Railway / DO / etc.)

Ensure these are set in your backend service (e.g. Railway Variables). Your app already reads them.

| Variable | Purpose | Where you have it |
|----------|---------|--------------------|
| `DATABASE_URL` | Postgres (Supabase) | Supabase → Settings → Database → connection string |
| `RESEND_API_KEY` | Resend API key | Resend dashboard |
| `EMAIL_FROM` | Sender address (e.g. `no-reply@notifications.techpotli.com`) | Your .env |
| `JWT_SECRET` | Auth | Your .env |
| `COOKIE_SECRET` | Sessions | Your .env |
| `HOST` | Bind address | Set to `0.0.0.0` on host (or use `scripts/railway-start.js`) |
| `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` | Allowed origins | Your frontend + admin URLs (e.g. Vercel) |
| R2_* | Cloudflare R2 (images) | Your .env |
| SUPABASE_* | Supabase storage (if used) | Your .env |
| RAZORPAY_* | Payments | Your .env |
| `REDIS_URL` | Optional; add when you need caching | e.g. Upstash Redis |

*Do not commit real keys to the repo; use the platform’s secret/env UI.*

---

## Medusa Cloud (Official Hosting)

**Tagline:** *The fastest and most reliable place to start building with Medusa.*

### What Medusa Cloud provides

- **Import from GitHub** – Connect repo, push-to-deploy.
- **Deploy backend and storefront** – Backend + optional storefront on one platform.
- **Medusa-tuned servers** – Pre-configured for Medusa (Node, env, scaling).
- **Faster APIs with Medusa Cache** – Integrated cache; up to ~80% lower API response time; cart ops and query layer cached with automatic invalidation.
- **Instant previews on PRs** – Preview environments per PR (Hobby: 1 PE, Pro: 3+).
- **Medusa Emails** – Built-in transactional emails (order/customer); limits by plan; deliverability insights, suppression, open/bounce tracking.

### Plans (from [docs](https://docs.medusajs.com/cloud/pricing))

| Plan       | Price        | Best for                          |
|-----------|--------------|------------------------------------|
| **Hobby** | From $29/mo  | Side projects, early dev           |
| **Pro**   | From $299/mo | Production, scaling, zero-downtime |
| **Enterprise** | Custom  | SLA, custom resources, Core team   |

**Included (all plans):** Postgres, Redis, S3, Medusa Cache, GitHub integration, SSL/TLS, logs, env vars, data import/export. **No GMV/platform fee** – pay for infrastructure only.

**Hobby limits (relevant for scale):** 1 shared server, 1 LLE, 1 PE, 600 compute hrs/mo, 10 GB data transfer, 3k emails/mo.  
**Pro adds:** 2 app servers + worker, autoscaling, zero-downtime deploys, automatic backups (14-day retention, point-in-time), 2.8k compute hrs, 100 GB transfer, 25k emails/mo (then $0.7/1k).

**Rough INR:** Hobby ≈ **₹2,600/mo**, Pro ≈ **₹27,000/mo**.

---

## Full Comparison: Backend Hosting for ~10k Concurrent Users

*Storefront stays on Vercel; DB on Supabase; R2 for files. Only backend hosting is compared.*

| Criteria              | **Railway**        | **DigitalOcean App Platform** | **Google Cloud Run** | **AWS ECS (Fargate)** | **Medusa Cloud**        |
|-----------------------|--------------------|-------------------------------|----------------------|------------------------|-------------------------|
| **Ease of setup**     | High (Git → deploy)| High                           | Medium               | Medium–High            | **Highest** (Medusa-native) |
| **Medusa-specific**  | No                 | No                             | No                   | No                     | **Yes** (servers, cache, emails) |
| **Scalability**      | Good (vertical + replicas) | Good              | Excellent (scale to zero) | Excellent           | Good (Pro: 2 servers + worker, autoscale) |
| **~10k users**       | 2–4 replicas + DB | 2–3 app components             | 2–4 tasks, 1–2 vCPU | 2–4 tasks, 0.5–1 vCPU | Pro tier recommended    |
| **Cost (backend only, ~10k users)** | ~₹4,500–9,000/mo (usage-based) | ~₹3,600–7,200/mo (Basic/Droplet) | ~₹4,500–11,000/mo | ~₹6,300–15,000/mo | **₹27,000/mo** (Pro) or ₹2,600 (Hobby, low traffic) |
| **Healthcheck / ops** | You configure     | Built-in                       | Built-in             | ALB + target group     | Managed                 |
| **Cache**            | You add Redis      | You add Redis                  | You add Redis        | You add ElastiCache    | **Medusa Cache included** |
| **Emails**           | Your provider      | Your provider                 | Your provider        | Your provider          | **Medusa Emails included** |
| **Preview envs**     | Manual / branch   | Manual                         | Manual               | Manual                 | **Instant on PRs**      |
| **Backups**          | Supabase           | Supabase                       | Supabase             | Supabase               | Included (Pro: 14-day, PITR) |
| **Best when**        | Fast iteration, cost control | Simple apps, predictable cost | Scale-to-zero, GCP ecosystem | AWS-centric, compliance | **Fastest path, less ops, Medusa optimizations** |

---

## Recommendation Summary

- **Use Medusa Cloud** if you want:
  - Least ops (GitHub → deploy, Medusa-tuned servers).
  - Medusa Cache and Medusa Emails out of the box.
  - Instant previews on PRs.
  - Willing to pay **~₹27,000/mo** for Pro at ~10k users (or start Hobby at **~₹2,600/mo** and upgrade when you need zero-downtime and more capacity).

- **Use Railway** if you want:
  - Keep Supabase + Vercel + R2; only host Medusa backend.
  - Lower cost (~₹4,5k–9k/mo for backend at ~10k users) and full control over env, Redis, and emails (you add them).

- **Use DigitalOcean** for a middle ground: simple UI, predictable pricing, you still manage Redis/emails and connect to Supabase/R2.

- **Use GCP Run or AWS ECS** when you need fine-grained scaling, multi-region, or existing cloud commitments; more setup and higher baseline cost.

---

## Cost Note for Your Stack

- **Supabase:** Pro ~$25/mo (≈ ₹2,250).
- **Vercel:** Pro ~$20/mo or usage-based (≈ ₹1,800+).
- **R2:** Pay-per-use; typically low unless huge traffic.
- **Backend:** Pick one row from the table above (e.g. Railway ~₹4.5–9k or Medusa Cloud Pro ~₹27k).

Total typical range for ~10k users: **~₹9,000–40,000/mo** depending on backend choice (Railway vs Medusa Pro) and Vercel tier.

---

## Quick summary: Supabase + Resend

| Question | Answer |
|----------|--------|
| **Best host for my setup?** | **Railway** (or DigitalOcean). Keeps Supabase + Resend; no DB or email migration. |
| **Do I need to change code?** | No. Set env vars on the host; your Resend integration already works. |
| **What about Medusa Cloud?** | Use it if you want least ops and are okay switching to Medusa’s DB + Medusa Emails (and leaving Supabase + Resend). |
| **Rough monthly cost (backend only)?** | Railway ~₹4.5–9k; DO ~₹3.6–7.2k; Medusa Cloud Pro ~₹27k (includes DB + emails). |
| **Full stack cost (Supabase + Vercel + R2 + Resend + backend)?** | Supabase Pro ~₹2,250, Vercel ~₹1,800+, R2/Resend low; + backend above → **~₹9k–15k/mo** with Railway. |

---

## Medusa Cloud: Redis and Emails (what they provide)

You asked: *Does Medusa provide Redis? What email do they provide? We’ll have to spend on Redis in the future.*

### Yes – Medusa Cloud includes Redis

**What you get:**

- **Managed Redis** per environment (each env has its own Redis; isolated like Postgres).
- **Pre-configured** for Medusa’s infra modules – no setup:
  - **Redis Event Module** – async events
  - **Redis Caching Module** – API/cart cache
  - **Redis Locking Module** – distributed locks
  - **Redis Workflow Engine** – background workflows
- **Medusa Auth** (customer login, sessions, workflows) can use this Redis for sessions, events, and workflows. On Medusa Cloud it’s all wired by default; you don’t configure `REDIS_URL` yourself.
- You **cannot** see or connect directly to the Redis instance; it’s managed. If you need custom Redis config, you’d bring your own external Redis and override in `medusa-config.ts`.

**Included limits (from [pricing](https://docs.medusajs.com/cloud/pricing)):**

| Plan   | Key Value Store (Redis) | Overage        |
|--------|--------------------------|----------------|
| Hobby  | 250 MB / mo              | $100 / 5 GB    |
| Pro    | 250 MB / mo              | $100 / 5 GB    |

So on Medusa Cloud you **don’t** add a separate Redis bill until you exceed the included 250 MB (and then it’s priced per 5 GB). For many apps, 250 MB is enough for cache + events + workflows for a while.

---

### Medusa Emails – what they provide

**What it is:**

- **Built-in email sending** for Medusa Cloud (transactional and marketing).
- **No Resend/SendGrid** – Medusa runs the email infra; you use the **Notification module** with the `email` channel (workflows, subscribers, API routes).
- **Order confirmations, password reset, verification, etc.** can go through Medusa Emails if you use the standard notification workflows and don’t add another email provider.
- **Dashboard:** sender domain verification, email activity (sent, delivered, open rate, click rate, bounce/complaint), so you get deliverability insights without a third-party tool.

**Limits by plan:**

| Plan   | Monthly emails | Overage        | Daily limit | Retention   |
|--------|----------------|----------------|-------------|-------------|
| Hobby  | 3,000          | –              | 100         | 12 hours    |
| Pro    | 25,000         | $0.7 / 1,000   | 1,500       | 3 days      |

**Setup:** Enabled by default on Cloud. You can verify your own sender domain (e.g. `no-reply@yourdomain.com`); otherwise emails send from a Medusa domain and may be limited to org members. No API key to manage – it’s part of the plan.

**Summary:** Medusa Cloud gives you **Redis + Emails** in the plan. You don’t add Upstash or Resend for those; future “Redis spend” on Medusa Cloud is only if you exceed 250 MB (then $100/5 GB).

---

### Our path (Railway + Supabase + Resend): future Redis and email spend

| Item   | Now                         | Future spend |
|--------|-----------------------------|--------------|
| **Redis** | Not required for basic run. Medusa works without Redis for small scale (events can be in-memory). | When you need **caching, workflows, or scale**: add **Upstash Redis** (~$0–10/mo for small, then ~₹900–2,700/mo for larger) or managed Redis on AWS/GCP. Plan **~₹500–3,000/mo** when you add it. |
| **Emails** | **Resend** – you already have it (verification, etc.). Cost is low (usage-based). | Resend scales with volume; typical e‑commerce stays in the free/low tier until high order volume. |

So **yes, in the future you will spend on Redis** on our path – when you add it (Upstash or similar). Medusa Cloud avoids that until you exceed 250 MB because Redis is included. The trade-off: we keep **Supabase** (DB) and **Resend** (email) and only add Redis when we need it; Medusa Cloud includes Redis (and email) but uses **Medusa’s DB** and **Medusa Emails** instead.

---

## Best platform for e-commerce now + multi-seller marketplace (seller panel)

**Goal:** Sell your products now as a good company; later run a **multi-seller marketplace** (like Amazon / Flipkart / Myntra) where many sellers use a **seller panel** to upload products and manage their data.

### Recommended stack (end-to-end)

| Layer | Platform | Why it fits |
|-------|----------|-------------|
| **Database** | **Supabase** (Postgres) | Strong company, managed Postgres, scales to millions of rows; supports multi-tenant (e.g. `seller_id` on products/orders). Keep your data here. |
| **Backend (Medusa API + Admin)** | **Railway** (now) → **AWS ECS** or **GCP Cloud Run** (when marketplace scales) | See phases below. |
| **Storefront (customer-facing)** | **Vercel** (Next.js) | Fast, global CDN; scales with traffic. |
| **Seller panel (future)** | Same backend (Medusa Admin + custom routes) or separate Next.js app on Vercel | Sellers use admin or a dedicated seller app; API stays on same backend. |
| **Images / files** | **Cloudflare R2** | S3-compatible, cheap; supports many sellers’ product images. |
| **Emails** | **Resend** | Transactional + seller notifications. |
| **Payments** | **Razorpay** (you have it) | Supports marketplace payouts (split payments, settlements) when you add sellers. |
| **Cache / jobs (when needed)** | **Upstash Redis** or **AWS ElastiCache** / **GCP Memorystore** | For API cache and background jobs (order sync, reports, seller notifications). |

---

### Phase 1: Now – single brand, sell your products

**Backend host: Railway** (or DigitalOcean App Platform)

- Deploy Medusa backend on **Railway** with Supabase, Resend, R2 (as in the rest of this doc).
- Single storefront on Vercel; one brand, your products.
- **Cost:** ~₹9k–15k/mo full stack. Stable, professional, good for a “good company” image.
- **Why Railway now:** Fast to ship, keeps Supabase + Resend, scales to thousands of orders and 10k+ users. No need for AWS/GCP yet.

---

### Phase 2: Growth – more products, more traffic

- Stay on **Railway** (or DO); add **Redis** (e.g. Upstash) for API cache and sessions.
- Add **background jobs** (e.g. BullMQ with Redis) for order emails, reports, sync.
- Scale backend replicas as traffic grows.
- **When to move:** If you hit limits (e.g. 50k+ orders/month, 100+ concurrent sellers, need queues/multi-region), plan migration to Phase 3.

---

### Phase 3: Multi-seller marketplace – seller panel (Amazon / Flipkart / Myntra style)

**What you’ll have:**

- **Sellers** sign up; each has a **seller panel** to:
  - Upload products (title, images, price, inventory)
  - Manage orders for their products
  - See their sales, payouts, and data
- **You** run the platform: commission, payouts (Razorpay), policies, support.
- **Customers** see one storefront with products from many sellers; cart/checkout can split by seller (or you aggregate).

**Backend host for Phase 3:** Prefer **AWS** or **GCP** when you need:

- Many sellers (e.g. 100+), high order volume, background jobs (order routing, payouts, reports).
- Managed queues (AWS SQS, GCP Cloud Tasks), workers, auto-scaling, multi-AZ.
- Enterprise-grade uptime and compliance.

| Option | Best for | What you get |
|--------|----------|----------------|
| **AWS** (ECS Fargate + RDS or keep Supabase + ElastiCache + SQS) | Marketplace at scale, India/global, enterprise | ECS for Medusa API + worker services; SQS for jobs; ElastiCache Redis; keep Supabase or move to RDS. |
| **GCP** (Cloud Run + Cloud SQL or Supabase + Memorystore + Cloud Tasks) | Same scale, preference for GCP | Cloud Run for API + workers; Cloud Tasks for jobs; Memorystore Redis; keep Supabase or Cloud SQL. |

You can still keep **Supabase** as the database in Phase 3 (it scales); only the **compute** (Medusa backend + workers) moves to AWS/GCP. Alternatively, move DB to RDS/Cloud SQL if you want everything in one cloud.

**Medusa and multi-seller:** Medusa v2 is flexible: you extend the data model (e.g. `seller_id` on product, product_variant, inventory; custom “seller” module), add seller-scoped admin routes or a separate seller app that calls the same API with seller auth. Your current stack (Supabase, R2, Resend, Razorpay) supports this; hosting choice is about scale and ops, not product features.

---

### Summary: best platform for you

| When | Backend hosting | Database | Full stack |
|------|-----------------|----------|------------|
| **Now (sell products, good company)** | **Railway** (or DigitalOcean) | **Supabase** | Supabase + Railway + Vercel + R2 + Resend + Razorpay |
| **Later (multi-seller, seller panel)** | Same until ~50k orders/mo or 100+ sellers; then consider **AWS ECS** or **GCP Cloud Run** for API + workers | **Supabase** (or RDS/Cloud SQL if you consolidate in one cloud) | Add Redis, job queues, seller app; keep Supabase unless you move DB by choice |

**Bottom line:** Start with **Railway + Supabase + Vercel + R2 + Resend**. That is the best platform for you right now to sell your products as a solid e-commerce company. When you add a seller panel and grow to a real multi-seller marketplace, keep Supabase and add Redis + background jobs; move backend compute to **AWS** or **GCP** when you need their scale and managed services.
