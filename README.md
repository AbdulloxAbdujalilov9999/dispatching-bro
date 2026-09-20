# Haulwise Dispatch

A freight dispatch interface in one static file — `index.html` (HTML, CSS and JS
inline, no build step, no Node server). Data is saved to **Google Sheets**: every
table is a tab you can open, filter and download as Excel.

**Modules:** dashboard, loads (drag-and-drop board + list, tracking timeline),
carriers, drivers, customers, invoices & settlements, reports, settings
(light/dark). Invoices open as printable documents (Print → Save as PDF). Loads
export/import as CSV.

## What is saved in the Sheet

| Tab | What's in it |
|---|---|
| **Loads** | Everything about a load: reference, status, customer / carrier / driver names, route, pickup & delivery place and date, commodity, equipment, weight, customer rate, carrier rate, margin, notes |
| **Tracking** | One row per status update of a load (time, status, location, note) |
| **Customers**, **Carriers**, **Drivers** | Company / driver details |
| **Invoices**, **Settlements** | Money owed to you / to carriers, linked to the load |

Rows also carry ids (used to link tables) and the readable names next to them,
so the sheet makes sense on its own. You can edit cells by hand; the site picks
the change up on **Settings → Refresh now** (or automatically within ~2 minutes).
Keep the header row and the `id` column intact. Extra columns you add are left alone.

## Connect Google Sheets (once, ~5 minutes)

1. Open your spreadsheet → **Extensions → Apps Script**. Delete the sample code and
   paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs). Save.
2. In Apps Script open **Project Settings** (gear) → **Script properties** →
   **Add script property**: name `ACCESS_CODE`, value = a password you choose.
   (If the script is not attached to your spreadsheet, also add `SHEET_ID` with
   the spreadsheet's id, or edit `DEFAULT_SHEET_ID` in the code.)
3. **Deploy → New deployment →** type **Web app** → *Execute as:* **Me**,
   *Who has access:* **Anyone** → Deploy → authorize when asked → copy the
   **Web app URL** (ends in `/exec`).
4. Open the site → **Settings → Google Sheets**, paste the URL, **Save & reload**,
   and enter your access code. To connect everyone automatically, put the URL in
   `CONFIG.sheetsUrl` at the top of `index.html` and redeploy.

The tabs and their header rows are created automatically on first use. After
changing `Code.gs` later, use **Deploy → Manage deployments → Edit → New version**.

## Deploy the site on Vercel

Import the repo, leave the framework preset on **Other** and build settings
empty, then deploy. It's just a static file.

## Good to know

- **Access:** everyone with the access code has full access. There are no
  individual accounts or roles yet.
- **Speed:** Google Apps Script takes about a second per request. Screens update
  immediately and the save happens in the background ("Saving…" in the sidebar);
  each action is a single request, and imports/demo data are one request too.
- **Shared use:** changes from other people appear when you refresh or refocus the
  tab. If two people edit the same record at the same moment, the last save wins.
- **Limits:** Apps Script has daily quotas that are far above a small team's use.
  A sheet holds up to 10 million cells.
- Without a URL the site works too, but saves only in the current browser.
- There are no rate confirmations in this version — only loads, invoices and settlements.
