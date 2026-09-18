# Haulwise Dispatch

A full freight dispatch platform: loads/dispatch board, carriers, drivers,
customers, rate confirmations (RCs) with PDF generation, invoicing, carrier
settlements, tracking, and reporting — built with Next.js and TypeScript,
using **Google Sheets as the database**. No database server, no VPS, no
paid plan: it runs free on Vercel with your data in a Google Sheet you own.

## Stack

- **Next.js 16 (App Router) + TypeScript + React 19** — UI and API routes in
  one app (see `AGENTS.md`: this major version differs from older training
  data, so check `node_modules/next/dist/docs/` before changing framework code).
- **Tailwind CSS** — design system.
- **Google Sheets** — the database. One tab per table (Users, Loads,
  Carriers, ...). Talks to the Sheets REST API directly with a service
  account; no extra dependencies. See `src/lib/db/`.
- **NextAuth (Credentials)** — authentication with role-based access
  (Admin / Manager / Dispatcher / Accounting / HR).
- **@react-pdf/renderer** — generates RC and invoice PDFs on demand.
- **Recharts** — dashboard and report charts.
- **Google Drive (optional)** — only used to keep signed RC files that
  dispatchers upload.

## How the Google Sheets backend works

The rest of the app still calls `prisma.load.findMany({...})`,
`prisma.load.create({...})` etc. exactly as before; `src/lib/prisma.ts` now
points at a small query engine (`src/lib/db/`) that supports the same calls
(`where`, `orderBy`, `include`, `select`, nested creates, `$transaction`)
on top of Google Sheets.

- Every table is a tab. Row 1 holds the column names. Rows are records.
- Reads fetch the tabs a page needs in **one** API request and cache them
  for a few seconds (10 s for the user list) to stay inside Google's quota.
- Writes re-read the affected tabs, apply the change, and save it in **one
  atomic** request. Excel imports and seeding run as a single batch.
- Cascade / set-null / restrict rules on delete are enforced by the app.
- You can open the Sheet and read or fix data by hand. Don't rename the tabs
  or the header row, and keep the `id` column filled in. Extra columns you
  add are left alone.
- Generated RC and invoice PDFs are built on the fly from the sheet data.

### Limits to know about

- **Speed:** each Google API call takes a few hundred milliseconds. Fine for a
  small team; not for dozens of people editing at once.
- **Quota:** Google allows about 60 read requests per minute for one service
  account. The app batches and caches to stay well below that and retries with
  backoff if it hits the limit.
- **Concurrent saves:** there are no database transactions. Two people saving
  at the very same instant on different servers could get the same LD-/RC-/INV-
  number; the second save is rejected with a "already exists" message and can
  be retried. Row edits are last-write-wins.
- **Size:** a Google Sheet holds up to 10 million cells; that is many
  thousands of loads, but the app reads whole tabs, so very large tabs get slow.
- **Freshness:** other server instances may show data up to ~4 s old.

## 1. Create the Google Sheet and service account (about 10 minutes)

1. Create a new blank Google Sheet at https://sheets.new and copy its ID from
   the URL (`https://docs.google.com/spreadsheets/d/<ID>/edit`).
2. Go to https://console.cloud.google.com → create a project (free).
3. **APIs & Services → Library** → enable **Google Sheets API**.
4. **APIs & Services → Credentials → Create credentials → Service account**.
   Name it (e.g. `haulwise`), finish, then open it → **Keys → Add key →
   Create new key → JSON**. A `.json` file downloads.
5. Open your Google Sheet → **Share** → paste the service account's email
   (`...@...iam.gserviceaccount.com`) → give it **Editor**.

## 2. Configure environment variables

```bash
cp .env.example .env
```

Set `GOOGLE_SHEET_ID`, paste the whole downloaded JSON key file (as one line)
into `GOOGLE_SERVICE_ACCOUNT_JSON`, and generate `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

## 3. Install, create the tabs and load the demo data

```bash
npm install
npm run db:setup    # checks access, creates the tabs and header rows
npm run db:seed     # adds the first logins and demo customers/carriers/loads
```

## 4. Run the app

```bash
npm run dev
```

Visit http://localhost:3000 and log in with the seeded demo account:

- **Email:** `admin@dispatchplatform.com`
- **Password:** `password123`

## 5. Deploying it for free on Vercel

1. Push this repo to GitHub and import it at https://vercel.com (**Add New
   Project**).
2. Under **Environment Variables** add `GOOGLE_SHEET_ID`,
   `GOOGLE_SERVICE_ACCOUNT_JSON` and `NEXTAUTH_SECRET`. Set `NEXTAUTH_URL`
   to `https://<your-project>.vercel.app`.
3. Click **Deploy**. The tabs and demo data are already in your Sheet from
   step 3 (Vercel doesn't run `db:setup`/`db:seed`).

Note: Vercel's free Hobby plan is meant for non-commercial use. If you need a
free host that allows commercial use, Cloudflare Pages or any small VPS also
works, since the app only needs Node.js and internet access to Google.

## Uploading signed Rate Confirmations (optional)

Generated RC/invoice PDFs need no storage. Only the **Upload signed RC**
feature keeps a file, in Google Drive. Google does not let a service account
own files in a personal Drive, so this uses an OAuth refresh token for your
own account:

1. In the same Google Cloud project enable the **Google Drive API** and create
   an **OAuth client ID** (type *Web application*, redirect URI
   `https://developers.google.com/oauthplayground`).
2. At https://developers.google.com/oauthplayground click the gear icon, tick
   **Use your own OAuth credentials**, enter the client ID/secret, authorize
   the scope `https://www.googleapis.com/auth/drive.file`, and exchange the
   code for tokens. Copy the **refresh token**.
3. Set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
   `GOOGLE_OAUTH_REFRESH_TOKEN` (and optionally `GOOGLE_DRIVE_FOLDER_ID`).

Without these, the upload button returns a clear "Drive storage isn't
configured" message and everything else keeps working.

## Project structure

```
src/lib/db/schema.ts         Tables/columns of the sheet database (one tab per model)
src/lib/db/client.ts         Query engine (findMany/create/update/... over Sheets)
src/lib/db/store.ts          Reading/caching tabs and writing changes to Sheets
src/lib/db/google.ts         Service-account auth + Sheets REST calls with retry
src/lib/prisma.ts            Exposes the client under the historical `prisma` name
src/lib/storage.ts           Optional Google Drive storage for uploaded RCs
scripts/setup-sheet.ts       Creates the tabs and checks access
scripts/seed.ts              Demo data and first logins
src/app/(app)/...            Authenticated dashboard pages (one folder per module)
src/app/login                Login page
src/app/api/...              REST API route handlers (CRUD for every module)
src/components/ui            Design system primitives (Button, Card, Table, ...)
src/components/<module>      Forms and module-specific UI
```

## Modules included

- **Dashboard** — KPIs, revenue chart, recent loads.
- **Loads / dispatch board** — kanban board + list view, full load lifecycle
  (Booked → Dispatched → In Transit → Delivered → Invoiced), tracking
  timeline per load, Excel import/export.
- **Carriers** — profiles, MC/DOT, insurance tracking, linked drivers/loads.
- **Drivers** — profiles, license/truck/trailer info, linked to a carrier.
- **Customers** — shipper profiles, linked loads/invoices.
- **Rate Confirmations (RCs)** — PDFs generated on demand, or upload a signed
  copy; status flow Draft → Sent → Signed.
- **Invoices & Settlements** — customer invoices (PDF) and carrier pay
  settlements, with status tracking (Draft/Sent/Paid, Pending/Approved/Paid).
- **Reports** — revenue vs. carrier cost, load volume by status, top
  carriers/customers.

## Notes on going to production

- Change the seeded demo passwords immediately, or delete the seed users and
  create real ones.
- `NEXTAUTH_URL` must be set to your deployed URL in production.
- Keep the Google Sheet private: share it only with the service account and
  the people who should be able to read all company data (it contains
  password hashes).
- Never commit `.env` or the service-account JSON key.
