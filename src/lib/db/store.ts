import { MODELS, type FieldDef, type ModelDef } from "./schema";
import { GoogleApiError, SHEETS_BASE, getSheetId, googleJson } from "./google";

// Reads whole sheet tabs into typed rows (with a short in-memory cache) and
// writes changes back to Google Sheets in a single atomic batchUpdate.

export interface StoredRow {
  /** 1-based row number in the sheet, or null for a row that hasn't been written yet. */
  rowNumber: number | null;
  values: Record<string, unknown>;
  /** The raw cells as read, so columns this app doesn't know about survive updates. */
  raw: unknown[];
}

export interface TableData {
  model: ModelDef;
  headers: string[];
  rows: StoredRow[];
  fetchedAt: number;
}

// ---------------------------------------------------------------------------
// Sheet/tab setup
// ---------------------------------------------------------------------------

interface SheetMeta {
  sheetIds: Map<string, number>;
}

// Next.js can load this module more than once (the proxy, route handlers and
// pages are bundled separately), so shared state lives on globalThis. That way
// a write made in one place invalidates the cache everywhere in the process.
interface SharedState {
  meta: Promise<SheetMeta> | null;
  cache: Map<string, TableData>;
  inflight: Map<string, Promise<Map<string, TableData>>>;
  generation: Map<string, number>;
}
const shared: SharedState = ((globalThis as any).__sheetsStore ??= {
  meta: null,
  cache: new Map(),
  inflight: new Map(),
  generation: new Map(),
});

export function ensureSchema(): Promise<SheetMeta> {
  if (!shared.meta) {
    shared.meta = setupSheets().catch((error) => {
      shared.meta = null;
      throw error;
    });
  }
  return shared.meta;
}

function headerCells(headers: string[]) {
  return headers.map((h) => ({
    userEnteredValue: { stringValue: h },
    userEnteredFormat: { textFormat: { bold: true } },
  }));
}

async function setupSheets(): Promise<SheetMeta> {
  const spreadsheetId = getSheetId();

  for (let attempt = 1; ; attempt++) {
    const meta = await googleJson<{ sheets?: { properties: { sheetId: number; title: string } }[] }>(
      `${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties`
    );
    const sheetIds = new Map<string, number>();
    let maxId = 0;
    for (const s of meta.sheets || []) {
      sheetIds.set(s.properties.title, s.properties.sheetId);
      maxId = Math.max(maxId, s.properties.sheetId);
    }

    const requests: unknown[] = [];
    const existingModels = Object.values(MODELS).filter((m) => sheetIds.has(m.sheet));
    const missingModels = Object.values(MODELS).filter((m) => !sheetIds.has(m.sheet));

    // New tabs: create with a bold, frozen header row.
    for (const model of missingModels) {
      const sheetId = ++maxId;
      sheetIds.set(model.sheet, sheetId);
      const headers = Object.keys(model.fields);
      requests.push({
        addSheet: {
          properties: {
            sheetId,
            title: model.sheet,
            gridProperties: { rowCount: 1000, columnCount: Math.max(26, headers.length), frozenRowCount: 1 },
          },
        },
      });
      requests.push({
        updateCells: {
          start: { sheetId, rowIndex: 0, columnIndex: 0 },
          rows: [{ values: headerCells(headers) }],
          fields: "userEnteredValue,userEnteredFormat.textFormat.bold",
        },
      });
    }

    // Existing tabs: add any header columns that are missing (e.g. after an upgrade).
    if (existingModels.length > 0) {
      const ranges = existingModels.map((m) => `ranges=${encodeURIComponent(`'${m.sheet}'!1:1`)}`).join("&");
      const headerData = await googleJson<{ valueRanges?: { values?: unknown[][] }[] }>(
        `${SHEETS_BASE}/${spreadsheetId}/values:batchGet?${ranges}&valueRenderOption=UNFORMATTED_VALUE`
      );
      existingModels.forEach((model, i) => {
        const present = ((headerData.valueRanges?.[i]?.values?.[0] as unknown[]) || []).map((h) => String(h));
        const missing = Object.keys(model.fields).filter((f) => !present.includes(f));
        if (missing.length === 0) return;
        requests.push({
          updateCells: {
            start: { sheetId: sheetIds.get(model.sheet)!, rowIndex: 0, columnIndex: present.length },
            rows: [{ values: headerCells(missing) }],
            fields: "userEnteredValue,userEnteredFormat.textFormat.bold",
          },
        });
      });
    }

    if (requests.length === 0) return { sheetIds };

    try {
      await googleJson(`${SHEETS_BASE}/${spreadsheetId}:batchUpdate`, { method: "POST", body: { requests } });
      return { sheetIds };
    } catch (error) {
      // A 400 here usually means another server instance created the same tabs at the same
      // moment; look again and fill in whatever is still missing. Anything else is a real error.
      if (attempt >= 3 || !(error instanceof GoogleApiError && error.status === 400)) throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Cell <-> value conversion
// ---------------------------------------------------------------------------

function parseCell(field: FieldDef, cell: unknown): unknown {
  if (cell === undefined || cell === null || cell === "") return null;

  switch (field.type) {
    case "string":
      return String(cell);
    case "int": {
      const n = Number(cell);
      return Number.isFinite(n) ? Math.trunc(n) : null;
    }
    case "decimal": {
      const n = Number(cell);
      return Number.isFinite(n) ? n : null;
    }
    case "boolean":
      return cell === true || String(cell).toLowerCase() === "true";
    case "datetime": {
      // ISO strings normally; a real date typed into the sheet arrives as a serial number.
      const d = typeof cell === "number" ? new Date(Math.round((cell - 25569) * 86400000)) : new Date(String(cell));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
}

function encodeCell(value: unknown) {
  if (value === null || value === undefined || value === "") return {};
  if (value instanceof Date) return { userEnteredValue: { stringValue: value.toISOString() } };
  if (typeof value === "number") return Number.isFinite(value) ? { userEnteredValue: { numberValue: value } } : {};
  if (typeof value === "boolean") return { userEnteredValue: { boolValue: value } };
  // stringValue is always stored as literal text, never interpreted as a formula.
  return { userEnteredValue: { stringValue: String(value) } };
}

function parseTable(model: ModelDef, valueRange: { range?: string; values?: unknown[][] }): TableData {
  const values = valueRange.values || [];
  const startRow = Number(/!\$?[A-Z]+\$?(\d+)/.exec(valueRange.range || "")?.[1] || 1);
  const headers = (values[0] || []).map((h) => String(h).trim());
  const colIndex = new Map<string, number>();
  headers.forEach((h, i) => {
    if (h && !colIndex.has(h)) colIndex.set(h, i);
  });

  const rows: StoredRow[] = [];
  for (let i = 1; i < values.length; i++) {
    const raw = values[i] || [];
    const parsed: Record<string, unknown> = {};
    for (const [name, field] of Object.entries(model.fields)) {
      const idx = colIndex.get(name);
      parsed[name] = idx === undefined ? null : parseCell(field, raw[idx]);
    }
    // Rows without a primary key (blank or half-deleted rows) are ignored but keep their row number.
    if (parsed[model.pk] === null) continue;
    rows.push({ rowNumber: startRow + i, values: parsed, raw });
  }

  return { model, headers, rows, fetchedAt: Date.now() };
}

// ---------------------------------------------------------------------------
// Cached reads
// ---------------------------------------------------------------------------

const { cache, inflight, generation } = shared;

function ttlFor(modelName: string): number {
  // Accounts are checked on every page request, so keep that lookup cheap.
  if (modelName === "user") return Number(process.env.SHEETS_USER_CACHE_TTL_MS ?? 10000);
  return Number(process.env.SHEETS_CACHE_TTL_MS ?? 4000);
}

async function fetchTables(names: string[]): Promise<Map<string, TableData>> {
  await ensureSchema();
  const spreadsheetId = getSheetId();
  const ranges = names.map((n) => `ranges=${encodeURIComponent(`'${MODELS[n].sheet}'`)}`).join("&");
  const data = await googleJson<{ valueRanges?: { range?: string; values?: unknown[][] }[] }>(
    `${SHEETS_BASE}/${spreadsheetId}/values:batchGet?${ranges}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER&majorDimension=ROWS`
  );
  const result = new Map<string, TableData>();
  names.forEach((name, i) => {
    result.set(name, parseTable(MODELS[name], data.valueRanges?.[i] || {}));
  });
  return result;
}

/**
 * Loads tables from the cache or the sheet. `fresh` bypasses the cache (used
 * before writing so row positions are current). All missing tables are fetched
 * with one API request.
 */
export async function getTables(names: string[], fresh = false): Promise<Map<string, TableData>> {
  const result = new Map<string, TableData>();
  const waits: Promise<Map<string, TableData>>[] = [];
  const toFetch: string[] = [];

  for (const name of names) {
    const cached = cache.get(name);
    if (!fresh && cached && Date.now() - cached.fetchedAt < ttlFor(name)) {
      result.set(name, cached);
    } else if (!fresh && inflight.has(name)) {
      waits.push(inflight.get(name)!);
    } else {
      toFetch.push(name);
    }
  }

  if (toFetch.length > 0) {
    const startedAt = new Map(toFetch.map((n) => [n, generation.get(n) || 0]));
    const p: Promise<Map<string, TableData>> = fetchTables(toFetch)
      .then((fetched) => {
        for (const [name, table] of fetched) {
          // Skip caching if a write invalidated this table while we were reading.
          if ((generation.get(name) || 0) === startedAt.get(name)) cache.set(name, table);
        }
        return fetched;
      })
      .finally(() => {
        for (const n of toFetch) if (inflight.get(n) === p) inflight.delete(n);
      });
    for (const n of toFetch) inflight.set(n, p);
    waits.push(p);
  }

  for (const fetched of await Promise.all(waits)) {
    for (const [name, table] of fetched) if (names.includes(name) && !result.has(name)) result.set(name, table);
  }
  return result;
}

function invalidate(name: string) {
  cache.delete(name);
  inflight.delete(name);
  generation.set(name, (generation.get(name) || 0) + 1);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface WorkingRow extends StoredRow {
  dirty: boolean;
  deleted: boolean;
}

export interface WorkingTable {
  model: ModelDef;
  headers: string[];
  rows: WorkingRow[];
  /** Bumped on every change so lookup indexes can be rebuilt lazily. */
  version: number;
}

export function toWorkingTable(data: TableData, clone: boolean): WorkingTable {
  return {
    model: data.model,
    headers: data.headers,
    version: 0,
    rows: data.rows.map((r) => ({
      rowNumber: r.rowNumber,
      values: clone ? { ...r.values } : r.values,
      raw: clone ? r.raw.slice() : r.raw,
      dirty: false,
      deleted: false,
    })),
  };
}

function rowCells(table: WorkingTable, row: WorkingRow) {
  const fieldNames = new Set(Object.keys(table.model.fields));
  return {
    values: table.headers.map((header, i) =>
      fieldNames.has(header) ? encodeCell(row.values[header]) : encodeCell(row.raw[i])
    ),
  };
}

/** Writes every change in the given tables as one atomic spreadsheets.batchUpdate call. */
export async function commitTables(tables: Iterable<WorkingTable>): Promise<void> {
  const updates: unknown[] = [];
  const appends: unknown[] = [];
  const deletes: unknown[] = [];
  const touched: string[] = [];
  let sheetIds: Map<string, number> | null = null;

  for (const table of tables) {
    const changed = table.rows.filter(
      (r) => (r.deleted && r.rowNumber !== null) || (!r.deleted && (r.dirty || r.rowNumber === null))
    );
    if (changed.length === 0) continue;

    sheetIds ||= (await ensureSchema()).sheetIds;
    const sheetId = sheetIds.get(table.model.sheet)!;
    touched.push(table.model.name);

    for (const row of table.rows) {
      if (row.deleted || (row.rowNumber !== null && !row.dirty)) continue;
      if (row.rowNumber !== null) {
        updates.push({
          updateCells: {
            start: { sheetId, rowIndex: row.rowNumber - 1, columnIndex: 0 },
            rows: [rowCells(table, row)],
            fields: "userEnteredValue",
          },
        });
      }
    }

    const inserts = table.rows.filter((r) => !r.deleted && r.rowNumber === null);
    if (inserts.length > 0) {
      appends.push({ appendCells: { sheetId, rows: inserts.map((r) => rowCells(table, r)), fields: "userEnteredValue" } });
    }

    // Delete from the bottom up (merging neighbours) so earlier row numbers stay valid.
    const deletedRows = table.rows
      .filter((r) => r.deleted && r.rowNumber !== null)
      .map((r) => r.rowNumber as number)
      .sort((a, b) => b - a);
    let range: { start: number; end: number } | null = null;
    const flush = () => {
      if (range) {
        deletes.push({
          deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: range.start - 1, endIndex: range.end } },
        });
      }
    };
    for (const rowNumber of deletedRows) {
      if (range && rowNumber === range.start - 1) {
        range.start = rowNumber;
      } else {
        flush();
        range = { start: rowNumber, end: rowNumber };
      }
    }
    flush();
  }

  const requests = [...updates, ...appends, ...deletes];
  if (requests.length === 0) return;

  try {
    await googleJson(`${SHEETS_BASE}/${getSheetId()}:batchUpdate`, { method: "POST", body: { requests } });
  } finally {
    // Whether or not it worked, our cached copy can no longer be trusted.
    for (const name of touched) invalidate(name);
  }
}
