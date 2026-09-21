# Haulwise Dispatch

A freight dispatch interface in one static file — `index.html` (HTML, CSS and JS
inline, no build step, no Node server). Data is saved to **Google Sheets**: every
table is a tab you can open, filter and download as Excel. People sign in with
an email + password or with Google, and each role only sees what its job needs.

**Modules:** dashboard, loads (drag-and-drop board + list, tracking timeline, route map),
brokers, carriers, drivers, invoices & settlements, reports, team, settings
(light/dark). Filters on the pages that need them, a **Refresh** button, and it installs as an app. Invoices open as printable documents (Print → Save as PDF). Loads
export/import as CSV.

## Accounts and roles

* **Owner** — `abdujalilov7707@gmail.com`. Can't be removed, disabled or demoted.
  Approves access requests on the **Team** page and is the only one who sees the
  Google Sheets URL / spreadsheet link in Settings.
* Anyone else taps **Request access** (or "Continue with Google"). Nothing is
  visible to them until the owner approves the request and picks a role.

| Area | Owner | Manager | Dispatcher | Accounting | HR |
|---|---|---|---|---|---|
| Loads & tracking | edit | edit | edit | edit | – |
| Brokers | edit | edit | edit | edit | – |
| Carriers | edit | edit | edit | view | edit |
| Drivers | edit | edit | edit | – | edit |
| Invoices & settlements | edit | edit | – | edit | – |
| Reports & revenue | view | view | – | view | – |
| Team, Sheet link, demo data | ✓ | – | – | – | – |

Only Owner and Manager can **delete** loads, brokers and carriers. Every load is saved under
the name of whoever adds it; only Owner and Manager can assign a load or a driver to a dispatcher. HR never
receives rates, revenue, invoices or reports — the script withholds that data,
it isn't just hidden on screen. The rules live in `apps-script/Code.gs`
(`ACCESS`, `DELETE`) and are mirrored in `index.html` (`SECTION`) for the menus.

## Dispatchers

* Whoever adds a load is recorded as its **dispatcher** (the script enforces this — it can't be
  faked from the browser). Owner and Manager get a *Dispatcher* picker to book on someone's behalf
  or reassign a load.
* **Drivers** have an *Assigned dispatcher* (Owner / Manager only). When a dispatcher books a load
  the driver list shows **My drivers** first.
* **Loads** can be filtered by dispatcher, and the strip under the filters shows the loads, gross,
  carrier cost, margin and average RPM of whatever is on screen. Dispatchers open Loads on their own
  loads by default (one click on *Clear filters* shows everyone's).
* **Reports → Dispatcher performance** lists every dispatcher with loads booked, gross, cost, margin
  and average RPM (filter by period; click a name to see their loads). The dashboard shows a
  dispatcher their own loads and gross for the month.

## Maps: city suggestions, miles and RPM

On a load, *Pickup city* and *Delivery city* suggest cities as you type (US, plus Canada/Mexico).
Picking both fills in the **driving miles**, and the form shows **broker RPM** and **carrier RPM**
(rate ÷ miles) live; you can overwrite the miles by hand. If you type a city without picking a
suggestion, it is looked up when you Save. Miles, RPM and the coordinates are saved on the load, and
the load page shows a route map.

These use free services with no key: **Photon** (OpenStreetMap data) for suggestions, the public
**OSRM** server for driving distance and **OpenStreetMap** tiles for the map (Leaflet). They are
shared community services with fair-use limits and no guarantees, and they receive the city names
you type. Answers are cached on the device. If a service is unreachable you can still type cities and
miles by hand (an estimated distance is used when only routing is down). For heavy or commercial use
consider swapping in a keyed provider — the calls live in one place (`GEO`, `citySuggest`,
`drivingMiles` in `index.html`).

## What is saved in the Sheet

| Tab | What's in it |
|---|---|
| **Loads** | Reference, status, broker / dispatcher / carrier / driver names, route, miles, broker rate, RPM, carrier rate, carrier RPM, margin, pickup & delivery place and date (+ coordinates), commodity, equipment, weight, notes |
| **Tracking** | One row per status update of a load (time, status, location, note) |
| **Brokers** | Name, MC, DOT, contact, phone, emails, address, payment terms, notes |
| **Carriers**, **Drivers** | Company / driver details (driver email, license and expiry are optional); drivers also carry their assigned dispatcher |
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

## Install it as an app (PWA)

The site is an installable web app: it gets its own icon and window and opens faster.

* **Chrome / Edge (computer):** click **Install app** in the sidebar (or Settings → *Install the app*),
  or the install icon in the address bar.
* **Android (Chrome):** the same **Install app** button, or the browser menu → *Install app*.
* **iPhone / iPad (Safari):** tap **Share → Add to Home Screen** (Apple gives websites no install button).

Once installed, long-press / right-click the icon for shortcuts to **Loads** and **Drivers**.

**Offline:** the app opens with no connection and shows the data from your last visit, with a banner.
Changes need a connection — while offline, edits are refused with a message rather than half-saved,
and if a save fails the screen change is undone. When you're back online it updates by itself.

Files: `manifest.webmanifest` (name, icons, colours), `sw.js` (service worker: keeps the app page
and icons for offline use; never touches Google Sheets, maps or sign-in requests), `icons/`.
Installing needs **HTTPS** (Vercel provides it) or `localhost`. After deploying, you can check it in
Chrome → DevTools → *Application* → *Manifest* / *Service Workers*, or run a Lighthouse "PWA" audit.
If you change `sw.js`, bump `VERSION` at its top.

## Deploy the site on Vercel

Import the repo, leave the framework preset on **Other** and build settings
empty, then deploy. It's just a static file.

## Good to know

* **Speed:** Google Apps Script itself needs 2–5 seconds per request; nothing on our side
  can remove that. So the site: opens **instantly** from a copy of your last data (kept on
  the device, removed when you sign out) and updates in the background; shows changes on
  screen immediately and saves in the background ("Saving…"); loads everything (and the team
  list) in one request; and sends each action as one request. Use **↻ Refresh** (sidebar, or
  the top bar on a phone) to pull the latest data on demand. If it is still too slow for you,
  the next step is a real database (Supabase / Firebase respond in ~0.1–0.3 s) — the storage
  is a small adapter, so the screens would not change.
* **Shared use:** changes from other people appear on refresh / when you return
  to the tab. If two people edit the same record at once, the last save wins.
* **Sign-in safety:** passwords are salted and hashed in the script, sessions last
  14 days and end when a password changes or an account is turned off, and 8 wrong
  passwords lock an account for 15 minutes.
* The web-app URL is in the page source (the browser needs it to sign in). It is
  useless without an approved account, and only the owner sees it in Settings.
* Without a URL the site works too, single-user, saving only in that browser.
