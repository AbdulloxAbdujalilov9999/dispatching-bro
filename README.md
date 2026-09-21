# Haulwise Dispatch

A freight dispatch interface in one static file — `index.html` (HTML, CSS and JS
inline, no build step, no Node server). Data is saved to **Google Sheets**: every
table is a tab you can open, filter and download as Excel. People sign in with
an email + password or with Google, and each role only sees what its job needs.

**Modules:** dashboard, loads (drag-and-drop board + list, tracking timeline),
brokers, carriers, drivers, invoices & settlements, reports, team, settings
(light/dark). Invoices open as printable documents (Print → Save as PDF). Loads
export/import as CSV.

## Accounts and roles

* **Owner** — `abdujalilov7707@gmail.com`. Can't be removed, disabled or demoted.
  Approves access requests on the **Team** page and is the only one who sees the
  Google Sheets URL / spreadsheet link in Settings.
* Anyone else taps **Request access** (or "Continue with Google"). Nothing is
  visible to them until the owner approves the request and picks a role.

| Area | Owner | Manager | Dispatcher | Accounting | HR |
|---|---|---|---|---|---|
| Loads & tracking | edit | edit | edit | view (can invoice a load) | – |
| Brokers | edit | edit | edit | edit | – |
| Carriers | edit | edit | edit | view | edit |
| Drivers | edit | edit | edit | – | edit |
| Invoices & settlements | edit | edit | – | edit | – |
| Reports & revenue | view | view | – | view | – |
| Team, Sheet link, demo data | ✓ | – | – | – | – |

Only Owner and Manager can **delete** loads, brokers and carriers. HR never
receives rates, revenue, invoices or reports — the script withholds that data,
it isn't just hidden on screen. The rules live in `apps-script/Code.gs`
(`ACCESS`, `DELETE`) and are mirrored in `index.html` (`SECTION`) for the menus.

## What is saved in the Sheet

| Tab | What's in it |
|---|---|
| **Loads** | Reference, status, broker / carrier / driver names, route, pickup & delivery place and date, commodity, equipment, weight, broker rate, carrier rate, margin, notes |
| **Tracking** | One row per status update of a load (time, status, location, note) |
| **Brokers** | Name, MC, DOT, contact, phone, emails, address, payment terms, notes |
| **Carriers**, **Drivers** | Company / driver details (driver email, license and expiry are optional) |
| **Invoices**, **Settlements** | Money owed to you / to carriers, linked to the load |

Accounts and password hashes are **not** in the spreadsheet — the script keeps
them in its private Script properties. You can edit sheet cells by hand; the
site picks changes up on Settings → Refresh now (or within ~2 minutes).

## Set it up (about 10 minutes)

1. Open your spreadsheet → **Extensions → Apps Script**, paste `apps-script/Code.gs`
   over the old code, **Save**.
2. **Project Settings → Script properties**, add:
   * `OWNER_SETUP_CODE` — a secret only you know (used once to create your password account)
   * `GOOGLE_CLIENT_ID` — only for "Continue with Google" (see below)
   * You can delete the old `ACCESS_CODE`.
3. **Deploy → Manage deployments → pencil → Version: New version → Deploy.**
   Authorize when asked (it needs permission to verify Google sign-ins).
4. **Lock the spreadsheet:** in Google Sheets click **Share → General access →
   Restricted**. Otherwise anyone with the link can read your data directly.
   The script runs as you, so the site keeps working.
5. Open the site → **Request access** → enter `abdujalilov7707@gmail.com`, your
   name, a password and the **Owner setup code**. You're the owner.
   Later, share the site address; people request access and you approve them in **Team**.

### Sign in with Google (optional)

1. Google Cloud Console → **APIs & Services → Credentials → Create credentials →
   OAuth client ID** → *Web application*. Under **Authorized JavaScript origins**
   add your site address (e.g. `https://your-site.vercel.app`). Copy the client ID.
2. Put it in `CONFIG.googleClientId` at the top of `index.html`, and in the
   Script property `GOOGLE_CLIENT_ID` — the same value in both places.
3. The "Continue with Google" button now appears. Google proves who someone is;
   you still have to approve them. (Signing in with Google also voids any
   password someone else set earlier for that email.)

## Deploy the site on Vercel

Import the repo, leave the framework preset on **Other** and build settings
empty, then deploy. It's just a static file.

## Good to know

* **Speed:** Google Apps Script takes 3+ seconds per request. Screens update
  immediately and saving happens in the background ("Saving…" in the sidebar);
  each action is a single request, and imports/demo data are one request too.
* **Shared use:** changes from other people appear on refresh / when you return
  to the tab. If two people edit the same record at once, the last save wins.
* **Sign-in safety:** passwords are salted and hashed in the script, sessions last
  14 days and end when a password changes or an account is turned off, and 8 wrong
  passwords lock an account for 15 minutes.
* The web-app URL is in the page source (the browser needs it to sign in). It is
  useless without an approved account, and only the owner sees it in Settings.
* Without a URL the site works too, single-user, saving only in that browser.
