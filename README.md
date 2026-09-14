# Haulwise Dispatch

A full freight dispatch platform: loads/dispatch board, carriers, drivers,
customers, rate confirmations (RCs) with PDF generation, invoicing, carrier
settlements, tracking, and reporting — built with Next.js, TypeScript,
Prisma, and Supabase.

## Stack

- **Next.js 16 (App Router) + TypeScript + React 19** — UI and API routes in
  one app, on the current stable Next.js release (the project started on
  Next 14, but was upgraded before shipping since that version has known
  security advisories — see `AGENTS.md`, which Next itself generates, for
  a heads-up that this major version differs from older training data).
- **Tailwind CSS** — design system.
- **Prisma** — type-safe database access and migrations.
- **Supabase** — free hosted Postgres database *and* file storage (used to
  store generated Rate Confirmation and Invoice PDFs).
- **NextAuth (Credentials)** — authentication with role-based access
  (Admin / Dispatcher / Accounting).
- **@react-pdf/renderer** — generates RC and invoice PDFs server-side.
- **Recharts** — dashboard and report charts.

## Why Supabase for the database

You asked for a free database to store RCs (Rate Confirmations) and the
rest of the platform's data. Supabase was chosen because:

1. It's a **real hosted Postgres database** (free tier), which Prisma
   supports natively with full relational integrity (loads ↔ carriers ↔
   RCs ↔ invoices, etc.).
2. It also includes **file storage** in the same free project, which this
   app uses to store the generated RC and invoice PDF files — so you don't
   need a second service for documents.
3. It has a built-in dashboard/table editor, useful if you ever want to
   look at or edit RC records by hand.

If you'd rather use a different database, everything here is standard
Prisma + Postgres, so any Postgres provider (Neon, Railway, RDS, etc.)
works — just skip the storage steps and configure your own object storage
(or leave `SUPABASE_SERVICE_ROLE_KEY` unset; PDF generation for RCs and
invoices will simply be retried and marked unavailable in the UI until
storage is configured).

## 1. Create your free Supabase project

1. Go to https://supabase.com and create a free account/project.
2. In your project, go to **Settings → Database → Connection string → URI**.
   - Copy the **Transaction pooler** connection string (port `6543`) →
     this is your `DATABASE_URL`.
   - Copy the **Session pooler / direct** connection string (port `5432`) →
     this is your `DIRECT_URL` (Prisma uses this for migrations).
   - Replace `[YOUR-PASSWORD]` with your database password (set when you
     created the project).
3. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** (not the anon key — this is a server-only secret)
     → `SUPABASE_SERVICE_ROLE_KEY`
4. Go to **Storage** and create a new **private** bucket named `documents`
   (or any name — just set `SUPABASE_STORAGE_BUCKET` to match).

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values from step 1:

```bash
cp .env.example .env
```

Generate a value for `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

## 3. Install dependencies and set up the database

```bash
npm install
npm run db:push     # creates all tables in your Supabase database
npm run db:seed     # loads demo data (customers, carriers, drivers, loads)
```

## 4. Run the app

```bash
npm run dev
```

Visit http://localhost:3000 and log in with the seeded demo account:

- **Email:** `admin@dispatchplatform.com`
- **Password:** `password123`

## 5. Deploying it for free

The database (Supabase) is already hosted and free regardless of where the
app itself runs. For the app, pick one:

### Option A — Vercel (recommended, easiest, free forever)

Vercel is built by the Next.js team and needs no server administration —
this is the fastest way to get a public URL.

1. Push this repo to GitHub (already done if you're reading this from the
   repo).
2. Go to https://vercel.com → sign in with GitHub → **Add New Project** →
   import `dispatch-platform`.
3. Before the first deploy, open **Environment Variables** and add every
   value from `.env.example` (`DATABASE_URL`, `DIRECT_URL`,
   `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_STORAGE_BUCKET`, `NEXTAUTH_SECRET`). For `NEXTAUTH_URL`, use the
   `https://<your-project>.vercel.app` URL Vercel will assign (you can see
   it before the first deploy, or fix it after and redeploy).
4. Click **Deploy**. Vercel runs `npm install` (which also runs
   `prisma generate` automatically via the `postinstall` script) and
   `npm run build`.
5. From your own machine, run `npm run db:push && npm run db:seed` once
   (pointed at the same `DATABASE_URL`) to create tables and demo data —
   Vercel doesn't run this for you.
6. Visit the Vercel URL and log in.

Free tier limits (hobby plan) are generous for a small team's dispatch
tool; no credit card required.

### Option B — a real free VPS (Oracle Cloud "Always Free")

If you specifically want a VPS you control, Oracle Cloud's Always Free tier
is the only major provider that stays free indefinitely (not just a trial),
with real always-on compute (up to 4 ARM OCPUs / 24 GB RAM, or a small x86
instance).

1. Sign up at https://www.oracle.com/cloud/free/ (requires card
   verification, but Always Free resources are never charged).
2. **Create Instance**: shape `VM.Standard.A1.Flex` (Ampere/ARM, Always
   Free) or `VM.Standard.E2.1.Micro` (x86, Always Free), image Ubuntu
   22.04/24.04. Add your SSH key.
3. In the instance's **Virtual Cloud Network → Security List**, add ingress
   rules for ports `80` and `443` (and `22` for SSH, usually already open).
4. SSH in and install Node.js 22, then clone and set up the app:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
   sudo apt-get install -y nodejs git nginx
   git clone https://github.com/AbdulloxAbdujalilov9999/dispatch-platform.git
   cd dispatch-platform
   cp .env.example .env   # fill in the same Supabase values as above,
                           # and set NEXTAUTH_URL to your domain or http://<server-ip>
   npm install             # also runs prisma generate
   npm run db:push
   npm run db:seed
   npm run build
   ```
5. Keep it running with pm2:
   ```bash
   sudo npm install -g pm2
   pm2 start npm --name haulwise -- start
   pm2 save
   pm2 startup   # then run the command it prints
   ```
   By default `next start` listens on port 3000.
6. Point Nginx at it so port 80 reaches your app (`sudo nano
   /etc/nginx/sites-available/default`, replace the `location /` block with
   `proxy_pass http://localhost:3000;`, then `sudo systemctl restart
   nginx`). Add HTTPS for free with `sudo apt install certbot
   python3-certbot-nginx && sudo certbot --nginx` if you have a domain
   pointed at the server.
7. Visit `http://<server-ip>` (or your domain) and log in.

This path needs you to manage OS updates, restarts, and HTTPS yourself —
Option A avoids all of that for the same $0 cost.

## Project structure

```
prisma/schema.prisma        Database schema (all entities & enums)
prisma/seed.ts               Demo data
src/app/(app)/...            Authenticated dashboard pages (one folder per module)
src/app/login                Login page
src/app/api/...               REST API route handlers (CRUD for every module)
src/components/ui             Design system primitives (Button, Card, Table, ...)
src/components/<module>       Forms and module-specific UI
src/lib                       Prisma client, auth config, Supabase storage, PDF generation, validation
```

## Modules included

- **Dashboard** — KPIs, revenue chart, recent loads.
- **Loads / dispatch board** — kanban board + list view, full load lifecycle
  (Booked → Dispatched → In Transit → Delivered → Invoiced), tracking
  timeline per load.
- **Carriers** — profiles, MC/DOT, insurance tracking, linked drivers/loads.
- **Drivers** — profiles, license/truck/trailer info, linked to a carrier.
- **Customers** — shipper profiles, linked loads/invoices.
- **Rate Confirmations (RCs)** — generated as PDFs, stored in Supabase
  Storage, status flow Draft → Sent → Signed.
- **Invoices & Settlements** — customer invoices (PDF) and carrier pay
  settlements, with status tracking (Draft/Sent/Paid, Pending/Approved/Paid).
- **Reports** — revenue vs. carrier cost, load volume by status, top
  carriers/customers.

## Known `npm audit` finding

`npm audit` reports a high-severity advisory for `deepmerge-ts` (stack
exhaustion on recursive input), pulled in transitively by the `prisma` CLI's
`@prisma/config` package. This only affects the `prisma` command-line tool
used locally for `db:push`/`db:migrate`/`db:seed`/`studio` — it is a
`devDependency` and is not part of `@prisma/client`, so it is never bundled
into the running app. No fixed release exists upstream yet; it will resolve
itself on the next `prisma` patch, at which point `npm update prisma` picks
it up.

## Notes on going to production

- Change the seeded demo password immediately, or delete the seed users and
  create real ones.
- `NEXTAUTH_URL` must be set to your deployed URL in production.
- The Supabase Storage bucket should stay **private**; the app mints
  short-lived signed URLs to view/download PDFs rather than exposing public
  links.
