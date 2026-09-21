/**
 * Haulwise Dispatch — Google Sheets backend (Google Apps Script web app)
 *
 * Every table is a tab in the spreadsheet; every record is a row you can read
 * and edit in Sheets/Excel. The website talks to this script over HTTPS.
 *
 * ACCOUNTS: people sign in with a password or with Google. New people "request
 * access"; the owner approves them and gives them a role. The rules for who can
 * see or change what are enforced HERE, not just in the page.
 *
 * Setup (once):
 *  1. Open the spreadsheet → Extensions → Apps Script, paste this file, Save.
 *  2. Project Settings (gear) → Script properties → add:
 *       OWNER_SETUP_CODE = a secret only you know (used once to create the owner password account)
 *       GOOGLE_CLIENT_ID = your Google OAuth client id (only if you want "Sign in with Google")
 *     (The old ACCESS_CODE property is no longer used; you can delete it.)
 *  3. Deploy → Manage deployments → pencil → Version: New version → Deploy.
 *     Google will ask you to authorize again (it needs to verify Google sign-ins).
 *  4. IMPORTANT: Share → General access → "Restricted" on the spreadsheet, so only you
 *     can open it directly. This script runs as you, so the website keeps working.
 *
 * First time: open the site → "Request access" with abdujalilov7707@gmail.com and the
 * OWNER_SETUP_CODE, or use "Continue with Google" with that Google account.
 */

// The one owner account. It can never be removed, disabled or demoted.
const OWNER_EMAIL = "abdujalilov7707@gmail.com";

// The spreadsheet to use. Leave as is if this script is attached to that sheet,
// or set the Script property SHEET_ID to point at a different one.
const DEFAULT_SHEET_ID = "1B0W_HQhyuxYGeJPjLf0YdHSgyAPiU2E1mjhSxK-6oFM";

const SESSION_DAYS = 14;
const HASH_ROUNDS = 1000;

// ---------------------------------------------------------------- who can do what
// view = may read the table; edit = may create/update/delete rows in it.
const ALL_ROLES = ["owner", "manager", "dispatcher", "accounting", "hr"];
const ASSIGNABLE_ROLES = ["manager", "dispatcher", "accounting", "hr"];
const LOADS_VIEW = ["owner", "manager", "dispatcher", "accounting"];
const LOADS_EDIT = ["owner", "manager", "dispatcher"];
const MONEY = ["owner", "manager", "accounting"];
const ACCESS = {
  loads:       { view: LOADS_VIEW, edit: LOADS_EDIT },
  tracking:    { view: LOADS_VIEW, edit: LOADS_EDIT },
  brokers:     { view: LOADS_VIEW, edit: ["owner", "manager", "dispatcher", "accounting"] },
  carriers:    { view: ALL_ROLES,  edit: ["owner", "manager", "dispatcher", "hr"] },
  drivers:     { view: ["owner", "manager", "dispatcher", "hr"], edit: ["owner", "manager", "dispatcher", "hr"] },
  invoices:    { view: MONEY, edit: MONEY },
  settlements: { view: MONEY, edit: MONEY }
};
// Deleting is narrower than editing: removing a load/broker/carrier also removes linked money records,
// which some roles can't even see, so only the owner and managers may do it.
const DELETE = {
  loads: ["owner", "manager"], tracking: ["owner", "manager"], brokers: ["owner", "manager"], carriers: ["owner", "manager"],
  drivers: ["owner", "manager", "dispatcher", "hr"], invoices: MONEY, settlements: MONEY
};
// Accounting can't edit loads, but invoicing a load has to mark it INVOICED (+ a tracking note).
const STATUS_ONLY = { accounting: ["loads", "tracking"] };
const STATUS_ONLY_KEYS = ["status", "updatedAt", "brokerName", "carrierName", "driverName", "route", "margin"];

// One tab per table. `cols` is the column order used when a tab is first created;
// any extra field the website sends is added as a new column automatically.
const TABS = {
  brokers:     { sheet: "Brokers",     cols: ["name", "mcNumber", "dotNumber", "contactName", "phone", "email", "billingEmail", "addressLine", "city", "state", "zip", "paymentTerms", "notes", "id", "createdAt", "updatedAt"] },
  carriers:    { sheet: "Carriers",    cols: ["name", "mcNumber", "dotNumber", "contactName", "phone", "email", "status", "insuranceProvider", "insuranceExpiry", "notes", "id", "createdAt", "updatedAt"] },
  drivers:     { sheet: "Drivers",     cols: ["name", "phone", "email", "carrierName", "licenseNumber", "licenseExpiry", "truckNumber", "trailerNumber", "status", "notes", "id", "carrierId", "createdAt", "updatedAt"] },
  loads:       { sheet: "Loads",       cols: ["ref", "status", "brokerName", "carrierName", "driverName", "route", "pickupLocation", "pickupDate", "deliveryLocation", "deliveryDate", "commodity", "equipment", "weightLbs", "brokerRate", "carrierRate", "margin", "notes", "id", "brokerId", "carrierId", "driverId", "createdAt", "updatedAt"] },
  tracking:    { sheet: "Tracking",    cols: ["loadRef", "at", "status", "location", "note", "id", "loadId", "createdAt", "updatedAt"] },
  invoices:    { sheet: "Invoices",    cols: ["invoiceNumber", "loadRef", "brokerName", "amount", "status", "dueDate", "paidAt", "notes", "id", "loadId", "brokerId", "createdAt", "updatedAt"] },
  settlements: { sheet: "Settlements", cols: ["loadRef", "carrierName", "amount", "status", "paidAt", "notes", "id", "loadId", "carrierId", "createdAt", "updatedAt"] }
};

function doGet() {
  return out_({ ok: true, message: "Haulwise Sheets API is running. The website calls it with POST." });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out_({ error: "Bad request", code: "bad" }); }
  try {
    return out_(dispatch_(body));
  } catch (err) {
    return out_({ error: (err && err.message) || String(err), code: (err && err.code) || "server" });
  }
}

function fail_(code, message) {
  var err = new Error(message);
  err.code = code;
  throw err;
}

function withLock_(fn) {                         // one writer at a time, so two people can't clash
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (err) { fail_("busy", "The sheet is busy, please try again."); }
  try { return fn(); } finally { lock.releaseLock(); }
}

function dispatch_(b) {
  var a = b.action;
  if (a === "ping") return { ok: true };
  if (a === "login") return login_(b);
  if (a === "googleLogin") return googleLogin_(b);
  if (a === "register") return withLock_(function () { return register_(b); });

  var user = authenticate_(b.token);             // everything below needs a signed-in, approved user
  if (a === "me") return { user: publicUser_(user), sheetUrl: sheetUrlFor_(user) };
  if (a === "loadAll") return withLock_(function () { return { user: publicUser_(user), sheetUrl: sheetUrlFor_(user), data: loadAll_(user) }; });
  if (a === "save") return withLock_(function () { save_(user, b.ops || []); return { ok: true }; });
  if (a === "changePassword") return withLock_(function () { return changePassword_(user, b); });

  if (user.role !== "owner") fail_("forbidden", "Only the owner can do that.");
  if (a === "users.list") return { users: allUsers_().map(publicUser_) };
  if (a === "users.update") return withLock_(function () { return updateUser_(b); });
  if (a === "users.resetPassword") return withLock_(function () { return resetPassword_(b); });
  if (a === "users.remove") return withLock_(function () { return removeUser_(b); });
  fail_("bad", "Unknown action");
}

// ---------------------------------------------------------------- accounts

function props_() { return PropertiesService.getScriptProperties(); }
function isOwnerEmail_(email) { return String(email).toLowerCase() === OWNER_EMAIL.toLowerCase(); }
function cleanEmail_(email) {
  email = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) fail_("email", "Enter a valid email address.");
  return email;
}
function checkPassword_(pw) {
  pw = String(pw || "");
  if (pw.length < 8) fail_("password", "Password must be at least 8 characters.");
  if (pw.length > 200) fail_("password", "Password is too long.");
  return pw;
}

// Users are kept in Script properties (not in the spreadsheet), so password hashes never appear in the sheet.
function getUser_(email) {
  var raw = props_().getProperty("user:" + String(email).toLowerCase());
  var u = raw ? JSON.parse(raw) : null;
  if (u && isOwnerEmail_(u.email)) { u.role = "owner"; u.status = "active"; }
  return u;
}
function putUser_(u) { props_().setProperty("user:" + u.email, JSON.stringify(u)); }
function allUsers_() {
  var all = props_().getProperties(), out = [];
  Object.keys(all).forEach(function (k) {
    if (k.indexOf("user:") === 0) { var u = JSON.parse(all[k]); if (isOwnerEmail_(u.email)) { u.role = "owner"; u.status = "active"; } out.push(u); }
  });
  out.sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); });
  return out;
}
function newUser_(email, name, role, status) {
  return { id: Utilities.getUuid(), email: email, name: String(name || email).trim().slice(0, 100), role: role || "", status: status, salt: "", hash: "", rounds: HASH_ROUNDS, emailVerified: false, sv: 0, createdAt: new Date().toISOString() };
}
function publicUser_(u) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, status: u.status, hasPassword: !!u.hash, emailVerified: !!u.emailVerified, createdAt: u.createdAt };
}
function sheetUrlFor_(u) {
  return u.role === "owner" ? "https://docs.google.com/spreadsheets/d/" + (props_().getProperty("SHEET_ID") || DEFAULT_SHEET_ID) + "/edit" : "";
}

function b64_(bytes) { return Utilities.base64EncodeWebSafe(bytes); }
function sameString_(a, b) {                       // constant-time compare
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var r = 0;
  for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function hashPassword_(password, salt, rounds) {
  var h = salt + ":" + password;
  for (var i = 0; i < rounds; i++) h = b64_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + h + password, Utilities.Charset.UTF_8));
  return h;
}
function setPassword_(u, password) {
  u.salt = Utilities.getUuid();
  u.rounds = HASH_ROUNDS;
  u.hash = hashPassword_(password, u.salt, u.rounds);
  u.sv = (u.sv || 0) + 1;                          // signs out every other session
}
function passwordOk_(u, password) {
  if (!u || !u.hash) { hashPassword_(String(password || ""), "x", HASH_ROUNDS); return false; }   // same work either way
  return sameString_(hashPassword_(String(password || ""), u.salt, u.rounds || HASH_ROUNDS), u.hash);
}

function secret_() {
  var s = props_().getProperty("SESSION_SECRET");
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props_().setProperty("SESSION_SECRET", s); }
  return s;
}
function makeToken_(u) {
  var payload = b64_(Utilities.newBlob(JSON.stringify({ e: u.email, x: Date.now() + SESSION_DAYS * 86400000, v: u.sv || 0 })).getBytes());
  return payload + "." + b64_(Utilities.computeHmacSha256Signature(payload, secret_()));
}
function readToken_(token) {
  var parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  if (!sameString_(b64_(Utilities.computeHmacSha256Signature(parts[0], secret_())), parts[1])) return null;
  try {
    var p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    return p.x > Date.now() ? p : null;
  } catch (err) { return null; }
}
function authenticate_(token) {
  var p = readToken_(token);
  var u = p && getUser_(p.e);
  if (!u || u.status !== "active" || (u.sv || 0) !== p.v) fail_("auth", "Please sign in again.");
  return u;
}
function sessionFor_(u) {
  if (u.status === "pending") return { pending: true };
  if (u.status !== "active") fail_("disabled", "This account has been turned off. Ask the owner.");
  return { token: makeToken_(u), user: publicUser_(u), sheetUrl: sheetUrlFor_(u) };
}

function throttle_(email) {                        // stops password guessing: 8 misses, then 15 minutes off
  var c = CacheService.getScriptCache(), n = Number(c.get("fail:" + email) || 0);
  return { blocked: n >= 8, miss: function () { c.put("fail:" + email, String(n + 1), 900); }, clear: function () { c.remove("fail:" + email); } };
}

function login_(b) {
  var email = cleanEmail_(b.email);
  var t = throttle_(email);
  if (t.blocked) fail_("throttled", "Too many wrong attempts. Try again in 15 minutes.");
  var u = getUser_(email);
  if (!passwordOk_(u, b.password)) { t.miss(); fail_("credentials", "Wrong email or password."); }
  t.clear();
  return sessionFor_(u);
}

function register_(b) {
  var email = cleanEmail_(b.email), name = String(b.name || "").trim();
  if (!name) fail_("name", "Enter your name.");
  var password = checkPassword_(b.password);
  if (getUser_(email)) fail_("exists", "An account or request with this email already exists.");
  if (allUsers_().length >= 300) fail_("full", "Too many accounts.");
  var u;
  if (isOwnerEmail_(email)) {
    // The owner account can only be created with the secret setup code (or by signing in with Google),
    // so nobody else can claim it first.
    var code = props_().getProperty("OWNER_SETUP_CODE");
    if (!code || !sameString_(String(b.setupCode || ""), code)) fail_("setup", "Owner setup code is missing or wrong.");
    u = newUser_(email, name, "owner", "active");
    u.emailVerified = true;
  } else {
    u = newUser_(email, name, "", "pending");
  }
  setPassword_(u, password);
  putUser_(u);
  return sessionFor_(u);
}

function verifyGoogle_(idToken) {
  var clientId = props_().getProperty("GOOGLE_CLIENT_ID");
  if (!clientId) fail_("google_off", "Google sign-in isn't set up yet. Use your email and password.");
  var res = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(String(idToken || "")), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) fail_("google", "Google sign-in failed. Try again.");
  var t = JSON.parse(res.getContentText());
  var issuerOk = t.iss === "accounts.google.com" || t.iss === "https://accounts.google.com";
  if (t.aud !== clientId || !issuerOk || String(t.email_verified) !== "true" || Number(t.exp) * 1000 < Date.now()) fail_("google", "Google sign-in failed. Try again.");
  return { email: String(t.email).toLowerCase(), name: t.name || t.email };
}

function googleLogin_(b) {
  var g = verifyGoogle_(b.idToken);
  return withLock_(function () {
    var u = getUser_(g.email);
    if (!u) {
      u = newUser_(g.email, g.name, isOwnerEmail_(g.email) ? "owner" : "", isOwnerEmail_(g.email) ? "active" : "pending");
      u.emailVerified = true;
      putUser_(u);
    } else if (!u.emailVerified) {
      // Google has just proven this person owns the email, so a password someone set earlier for it is void.
      u.emailVerified = true; u.hash = ""; u.salt = ""; u.sv = (u.sv || 0) + 1;
      putUser_(u);
    }
    return sessionFor_(u);
  });
}

function changePassword_(user, b) {
  var next = checkPassword_(b.next);
  if (user.hash && !passwordOk_(user, b.current)) fail_("credentials", "Your current password is wrong.");
  setPassword_(user, next);
  putUser_(user);
  return { token: makeToken_(user), user: publicUser_(user) };
}

function targetUser_(b) {
  var u = getUser_(cleanEmail_(b.email));
  if (!u) fail_("missing", "That person wasn't found.");
  if (isOwnerEmail_(u.email)) fail_("owner", "The owner account can't be changed here.");
  return u;
}
function updateUser_(b) {
  var u = targetUser_(b);
  if (b.role !== undefined) {
    if (ASSIGNABLE_ROLES.indexOf(b.role) < 0) fail_("role", "Pick manager, dispatcher, accounting or hr.");
    u.role = b.role;
  }
  if (b.status !== undefined) {
    if (["active", "disabled"].indexOf(b.status) < 0) fail_("status", "Bad status.");
    if (b.status === "active" && ASSIGNABLE_ROLES.indexOf(u.role) < 0) fail_("role", "Choose a role before approving.");
    u.status = b.status;
    if (b.status === "disabled") u.sv = (u.sv || 0) + 1;
  }
  putUser_(u);
  return { user: publicUser_(u) };
}
function resetPassword_(b) {
  var u = targetUser_(b);
  setPassword_(u, checkPassword_(b.password));
  putUser_(u);
  return { ok: true };
}
function removeUser_(b) {
  var u = targetUser_(b);
  props_().deleteProperty("user:" + u.email);
  return { ok: true };
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
  var last = sh.getLastRow();
  if (last <= 1) {
    // Empty tab: (re)write the header row, so renamed columns (e.g. customer -> broker) take effect.
    var have = last === 0 ? [] : sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(String);
    while (have.length && have[have.length - 1] === "") have.pop();
    if (have.join("|") !== def.cols.join("|")) {
      if (last === 1) sh.getRange(1, 1, 1, Math.max(have.length, def.cols.length)).clearContent();
      sh.getRange(1, 1, 1, def.cols.length).setNumberFormat("@").setValues([def.cols]).setFontWeight("bold");
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

// ---------------------------------------------------------------- reading

function loadAll_(user) {
  var result = {};
  Object.keys(TABS).forEach(function (t) {
    result[t] = ACCESS[t].view.indexOf(user.role) >= 0 ? readTable_(t) : [];   // no view permission = no data leaves the sheet
  });
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
function checkOps_(user, ops) {
  ops.forEach(function (o) {
    var acc = ACCESS[o.table];
    if (!acc || ["create", "update", "remove"].indexOf(o.op) < 0) fail_("bad", "Bad request");
    if (o.op === "remove" && DELETE[o.table].indexOf(user.role) < 0) fail_("forbidden", "Your role (" + user.role + ") can't delete " + o.table + ".");
    if (acc.edit.indexOf(user.role) >= 0) return;
    var statusOnly = (STATUS_ONLY[user.role] || []).indexOf(o.table) >= 0 && (
      (o.op === "update" && Object.keys(o.patch || {}).every(function (k) { return STATUS_ONLY_KEYS.indexOf(k) >= 0; })) ||
      (o.op === "create" && o.table === "tracking"));
    if (!statusOnly) fail_("forbidden", "Your role (" + user.role + ") can't change " + o.table + ".");
  });
}

function save_(user, ops) {
  checkOps_(user, ops);
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
