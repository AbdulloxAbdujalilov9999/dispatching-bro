# Haulwise Dispatch

A freight dispatch interface in one static file: `index.html` (HTML, CSS and JS
inline, no build step, no Node server).

**Modules:** dashboard, loads (drag-and-drop board + list, tracking timeline),
carriers, drivers, customers, rate confirmations, invoices & settlements,
reports, settings (light/dark). Rate confirmations and invoices open as
printable documents (Print → Save as PDF). Loads export/import as CSV.

## Run it

Open `index.html` in a browser, or serve the folder with any static host.
On **Settings → Load demo data** you can fill it with sample records.

## Deploy on Vercel

Import the repo, leave the framework preset on **Other** and build settings
empty, then deploy. It's just a static file.

## Database

All storage goes through one adapter near the top of `index.html`
(section 2, `adapters`). It is `local` (this browser only) until you add a
real one. An adapter needs four async methods: `list`, `create`, `update`,
`remove`. The file includes a Supabase example; Firebase and Google Sheets
adapters follow the same shape. Set `CONFIG.adapter` to its name.

There is no login yet — sign-in has to come from the database service you
choose (e.g. Supabase Auth or Firebase Auth).
