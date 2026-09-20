/**
 * Haulwise Dispatch — Google Sheets backend (Google Apps Script web app)
 *
 * Every table is a tab in the spreadsheet; every record is a row you can read
 * and edit in Sheets/Excel. The website talks to this script over HTTPS.
 *
 * Setup (once):
 *  1. Open the spreadsheet → Extensions → Apps Script, paste this file.
 *  2. Project Settings (gear) → Script properties → Add property:
 *       ACCESS_CODE = a password of your choice (the website asks for it)
 *  3. Deploy → New deployment → type "Web app":
 *       Execute as: Me      Who has access: Anyone
 *     Authorize when asked, then copy the Web app URL (ends in /exec).
 *  4. Paste that URL into the website: Settings → Google Sheets.
 *
 * After changing this code, use Deploy → Manage deployments → Edit → New version.
 */

// The spreadsheet to use. Leave as is if this script is attached to that sheet,
// or set the Script property SHEET_ID to point at a different one.
const DEFAULT_SHEET_ID = "1B0W_HQhyuxYGeJPjLf0YdHSgyAPiU2E1mjhSxK-6oFM";

// One tab per table. `cols` is the column order used when a tab is first created;
// any extra field the website sends is added as a new column automatically.
const TABS = {
  customers:   { sheet: "Customers",   cols: ["name", "contactName", "phone", "email", "addressLine", "city", "state", "zip", "notes", "id", "createdAt", "updatedAt"] },
  carriers:    { sheet: "Carriers",    cols: ["name", "mcNumber", "dotNumber", "contactName", "phone", "email", "status", "insuranceProvider", "insuranceExpiry", "notes", "id", "createdAt", "updatedAt"] },
  drivers:     { sheet: "Drivers",     cols: ["name", "phone", "email", "carrierName", "licenseNumber", "licenseExpiry", "truckNumber", "trailerNumber", "status", "notes", "id", "carrierId", "createdAt", "updatedAt"] },
  loads:       { sheet: "Loads",       cols: ["ref", "status", "customerName", "carrierName", "driverName", "route", "pickupLocation", "pickupDate", "deliveryLocation", "deliveryDate", "commodity", "equipment", "weightLbs", "customerRate", "carrierRate", "margin", "notes", "id", "customerId", "carrierId", "driverId", "createdAt", "updatedAt"] },
  tracking:    { sheet: "Tracking",    cols: ["loadRef", "at", "status", "location", "note", "id", "loadId", "createdAt", "updatedAt"] },
  invoices:    { sheet: "Invoices",    cols: ["invoiceNumber", "loadRef", "customerName", "amount", "status", "dueDate", "paidAt", "notes", "id", "loadId", "customerId", "createdAt", "updatedAt"] },
  settlements: { sheet: "Settlements", cols: ["loadRef", "carrierName", "amount", "status", "paidAt", "notes", "id", "loadId", "carrierId", "createdAt", "updatedAt"] }
};

function doGet() {
  return out_({ ok: true, message: "Haulwise Sheets API is running. The website calls it with POST." });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out_({ error: "Bad request" }); }

  var code = PropertiesService.getScriptProperties().getProperty("ACCESS_CODE");
  if (!code) return out_({ error: "ACCESS_CODE is not set. In Apps Script: Project Settings → Script properties → add ACCESS_CODE." });
  if (String(body.key || "") !== code) return out_({ error: "unauthorized" });

  var lock = LockService.getScriptLock();       // one writer at a time, so two dispatchers can't clash
  try { lock.waitLock(25000); } catch (err) { return out_({ error: "The sheet is busy, please try again." }); }
  try {
    if (body.action === "ping") return out_({ ok: true });
    if (body.action === "loadAll") return out_({ data: loadAll_() });
    if (body.action === "save") { save_(body.ops || []); return out_({ ok: true }); }
    return out_({ error: "Unknown action" });
  } catch (err) {
    return out_({ error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function spreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty("SHEET_ID") || DEFAULT_SHEET_ID;
  return SpreadsheetApp.openById(id);
}

function sheetFor_(table) {
  var def = TABS[table];
  if (!def) throw new Error("Unknown table: " + table);
  var ss = spreadsheet_();
  var sh = ss.getSheetByName(def.sheet);
  if (!sh) sh = ss.insertSheet(def.sheet);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, def.cols.length).setNumberFormat("@").setValues([def.cols]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

// ---------------------------------------------------------------- reading

function loadAll_() {
  var result = {};
  Object.keys(TABS).forEach(function (t) { result[t] = readTable_(t); });
  return result;
}

function readTable_(table) {
  var sh = sheetFor_(table);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var headers = values[0].map(String);
  var idIdx = headers.indexOf("id");
  if (idIdx < 0) return [];
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    if (values[r][idIdx] === "") continue;
    var o = {};
    for (var c = 0; c < headers.length; c++) if (headers[c]) o[headers[c]] = cell_(values[r][c]);
    rows.push(o);
  }
  return rows;
}

function cell_(v) {
  if (v === "") return null;
  if (v instanceof Date) return v.toISOString();   // a date typed by hand into the sheet
  return v;
}

// ---------------------------------------------------------------- writing

// ops: [{op:"create", table, row}, {op:"update", table, id, patch}, {op:"remove", table, id}]
function save_(ops) {
  var byTable = {};
  ops.forEach(function (o) { (byTable[o.table] = byTable[o.table] || []).push(o); });
  Object.keys(byTable).forEach(function (t) { applyTable_(t, byTable[t]); });
}

function applyTable_(table, ops) {
  var sh = sheetFor_(table);
  var headers = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(String);

  // New fields become new columns on the right.
  var extra = [];
  ops.forEach(function (o) {
    Object.keys(o.row || o.patch || {}).forEach(function (k) {
      if (headers.indexOf(k) < 0 && extra.indexOf(k) < 0) extra.push(k);
    });
  });
  if (extra.length) {
    sh.getRange(1, headers.length + 1, 1, extra.length).setNumberFormat("@").setValues([extra]).setFontWeight("bold");
    headers = headers.concat(extra);
  }

  var idIdx = headers.indexOf("id");
  if (idIdx < 0) throw new Error("The " + TABS[table].sheet + " tab has no 'id' column.");

  // Work on a copy of the sheet's rows in memory, then write back only what changed.
  var last = sh.getLastRow();
  var data = last > 1 ? sh.getRange(2, 1, last - 1, headers.length).getValues() : [];
  var existing = data.map(function (row, i) { return { row: row, sheetRow: i + 2, dirty: false, deleted: false }; });
  var byId = {};
  existing.forEach(function (rec) { if (rec.row[idIdx] !== "") byId[String(rec.row[idIdx])] = rec; });
  var appended = [];

  ops.forEach(function (o) {
    if (o.op === "create") {
      var rec = { row: headers.map(function (h) { return encode_(o.row[h]); }), sheetRow: null, dirty: true, deleted: false };
      appended.push(rec);
      byId[String(o.row.id)] = rec;
    } else if (o.op === "update") {
      var target = byId[String(o.id)];
      if (!target) return;
      Object.keys(o.patch).forEach(function (k) { target.row[headers.indexOf(k)] = encode_(o.patch[k]); });
      target.dirty = true;
    } else if (o.op === "remove") {
      var gone = byId[String(o.id)];
      if (!gone) return;
      gone.deleted = true;
      delete byId[String(o.id)];
    }
  });

  // 1) changed rows (neighbouring rows are written together)
  var dirty = existing.filter(function (r) { return r.dirty && !r.deleted; });
  var run = [];
  dirty.forEach(function (rec, i) {
    run.push(rec);
    var next = dirty[i + 1];
    if (!next || next.sheetRow !== rec.sheetRow + 1) {
      writeRows_(sh, run[0].sheetRow, run.map(function (r) { return r.row; }));
      run = [];
    }
  });

  // 2) new rows, in one block below the last row
  var fresh = appended.filter(function (r) { return !r.deleted; });
  if (fresh.length) {
    var start = last + 1, needed = start + fresh.length - 1;
    if (needed > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), needed - sh.getMaxRows());
    writeRows_(sh, start, fresh.map(function (r) { return r.row; }));
  }

  // 3) deleted rows, bottom-up so row numbers stay valid
  var doomed = existing.filter(function (r) { return r.deleted; }).map(function (r) { return r.sheetRow; }).sort(function (a, b) { return b - a; });
  for (var i = 0; i < doomed.length; ) {
    var count = 1;
    while (i + count < doomed.length && doomed[i + count] === doomed[i] - count) count++;
    sh.deleteRows(doomed[i] - count + 1, count);
    i += count;
  }
}

function writeRows_(sh, startRow, rows) {
  var range = sh.getRange(startRow, 1, rows.length, rows[0].length);
  // Text cells are formatted as plain text first, so Sheets never turns "01234" or an ISO date into a number/date.
  range.setNumberFormats(rows.map(function (r) { return r.map(format_); }));
  range.setValues(rows);
}

function format_(v) {
  if (typeof v === "string") return "@";
  if (v instanceof Date) return "yyyy-mm-dd hh:mm";
  return "General";
}

function encode_(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}
