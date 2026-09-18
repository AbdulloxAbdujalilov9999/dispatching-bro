import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import { MODELS, MODEL_NAMES, type FieldDef, type ModelDef } from "./schema";
import { commitTables, getTables, toWorkingTable, type WorkingRow, type WorkingTable } from "./store";
import type * as T from "./types";

// A small query engine over Google Sheets that speaks the subset of the Prisma
// client API this app uses (findMany/findUnique/create/update/delete/count,
// where/orderBy/select/include, nested creates, $transaction). Every page and
// API route keeps calling `prisma.load.findMany({...})` exactly as before.

export class DbError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "DbError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Session: the tables loaded for one operation (or one batch/transaction)
// ---------------------------------------------------------------------------

class Session {
  tables = new Map<string, WorkingTable>();
  private loading = new Map<string, Promise<void>>();
  private indexes = new Map<string, { version: number; map: Map<unknown, WorkingRow[]> }>();
  private chain: Promise<unknown> = Promise.resolve();

  constructor(readonly writable: boolean) {}

  /** Runs operations on this session one at a time, so concurrent calls can't interleave. */
  run<R>(fn: () => Promise<R>): Promise<R> {
    const result = this.chain.then(fn);
    this.chain = result.catch(() => undefined);
    return result;
  }

  async ensure(names: Iterable<string>) {
    const wanted = [...new Set(names)];
    const missing = wanted.filter((n) => !this.tables.has(n) && !this.loading.has(n));
    if (missing.length > 0) {
      // Writes always read fresh rows so row positions are current.
      const p = getTables(missing, this.writable).then((loaded) => {
        for (const [name, table] of loaded) this.tables.set(name, toWorkingTable(table, this.writable));
      });
      for (const n of missing) this.loading.set(n, p);
    }
    await Promise.all(wanted.map((n) => this.loading.get(n)));
  }

  rows(name: string): WorkingRow[] {
    return this.tables.get(name)!.rows.filter((r) => !r.deleted);
  }

  index(name: string, field: string): Map<unknown, WorkingRow[]> {
    const table = this.tables.get(name)!;
    const key = `${name}.${field}`;
    const cached = this.indexes.get(key);
    if (cached && cached.version === table.version) return cached.map;
    const map = new Map<unknown, WorkingRow[]>();
    for (const row of table.rows) {
      if (row.deleted) continue;
      const v = row.values[field];
      if (v === null || v === undefined) continue;
      const bucket = map.get(v);
      if (bucket) bucket.push(row);
      else map.set(v, [row]);
    }
    this.indexes.set(key, { version: table.version, map });
    return map;
  }

  insert(name: string, values: Record<string, unknown>): WorkingRow {
    const table = this.tables.get(name)!;
    const row: WorkingRow = { rowNumber: null, values, raw: [], dirty: true, deleted: false };
    table.rows.push(row);
    table.version++;
    return row;
  }

  touch(name: string, row: WorkingRow) {
    row.dirty = true;
    this.tables.get(name)!.version++;
  }

  remove(name: string, row: WorkingRow) {
    row.deleted = true;
    this.tables.get(name)!.version++;
  }

  commit() {
    return commitTables(this.tables.values());
  }
}

const als = new AsyncLocalStorage<Session>();

// Shared across module copies (see store.ts) so all writes in a process queue up together.
const lockState: { tail: Promise<unknown>; lastStamp: number } = ((globalThis as any).__sheetsLock ??= {
  tail: Promise.resolve(),
  lastStamp: 0,
});
function withWriteLock<R>(fn: () => Promise<R>): Promise<R> {
  const result = lockState.tail.then(fn);
  lockState.tail = result.catch(() => undefined);
  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strictly increasing timestamps, so rows created back-to-back keep a stable order. */
function nowStamp(): Date {
  lockState.lastStamp = Math.max(Date.now(), lockState.lastStamp + 1);
  return new Date(lockState.lastStamp);
}

function newId(): string {
  return "c" + Date.now().toString(36) + randomBytes(9).toString("base64url").replace(/[-_]/g, "x").toLowerCase();
}

function cloneValue(v: unknown): unknown {
  return v instanceof Date ? new Date(v.getTime()) : v;
}

function norm(v: unknown): unknown {
  return v instanceof Date ? v.getTime() : v;
}

function isPlainObject(v: unknown): v is Record<string, any> {
  return typeof v === "object" && v !== null && !(v instanceof Date) && !Array.isArray(v);
}

function asArray<X>(v: X | X[] | undefined): X[] {
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

function coerce(model: ModelDef, name: string, field: FieldDef, v: unknown): unknown {
  if (v === null) {
    if (!field.optional) throw new DbError("P2011", `Null constraint violation on ${model.name}.${name}`);
    return null;
  }
  switch (field.type) {
    case "string": {
      const s = typeof v === "string" ? v : String(v);
      if (field.values && !field.values.includes(s)) {
        throw new DbError("P2009", `Invalid value "${s}" for ${model.name}.${name}. Expected one of: ${field.values.join(", ")}`);
      }
      return s;
    }
    case "int": {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new DbError("P2009", `Invalid number for ${model.name}.${name}`);
      return Math.round(n);
    }
    case "decimal": {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new DbError("P2009", `Invalid number for ${model.name}.${name}`);
      return Math.round(n * 100) / 100;
    }
    case "boolean":
      return Boolean(v);
    case "datetime": {
      const d = v instanceof Date ? v : new Date(v as string | number);
      if (Number.isNaN(d.getTime())) throw new DbError("P2009", `Invalid date for ${model.name}.${name}`);
      return new Date(d.getTime());
    }
  }
}

// ---------------------------------------------------------------------------
// Filtering and sorting
// ---------------------------------------------------------------------------

function matchField(actual: unknown, cond: unknown): boolean {
  if (cond === null) return actual === null || actual === undefined;
  if (!isPlainObject(cond)) return norm(actual) === norm(cond);

  const A = norm(actual ?? null);
  const insensitive = cond.mode === "insensitive";
  const fold = (x: unknown) => (insensitive && typeof x === "string" ? x.toLowerCase() : x);

  for (const [op, value] of Object.entries(cond)) {
    if (value === undefined) continue;
    switch (op) {
      case "mode":
        break;
      case "equals":
        if (value === null ? A !== null : fold(A) !== fold(norm(value))) return false;
        break;
      case "not":
        // Like SQL, `not: x` never matches NULL columns (except `not: null`).
        if (A === null && value !== null) return false;
        if (value === null) {
          if (A === null) return false;
        } else if (isPlainObject(value)) {
          if (matchField(actual, value)) return false;
        } else if (fold(A) === fold(norm(value))) {
          return false;
        }
        break;
      case "in":
        if (!(value as unknown[]).some((x) => fold(norm(x)) === fold(A))) return false;
        break;
      case "notIn":
        if (A === null || (value as unknown[]).some((x) => fold(norm(x)) === fold(A))) return false;
        break;
      case "lt":
      case "lte":
      case "gt":
      case "gte": {
        if (A === null) return false;
        const b = norm(value) as any;
        const a = A as any;
        if (op === "lt" && !(a < b)) return false;
        if (op === "lte" && !(a <= b)) return false;
        if (op === "gt" && !(a > b)) return false;
        if (op === "gte" && !(a >= b)) return false;
        break;
      }
      case "contains":
      case "startsWith":
      case "endsWith": {
        if (typeof A !== "string") return false;
        const s = fold(A) as string;
        const t = fold(value) as string;
        if (op === "contains" && !s.includes(t)) return false;
        if (op === "startsWith" && !s.startsWith(t)) return false;
        if (op === "endsWith" && !s.endsWith(t)) return false;
        break;
      }
      default:
        throw new Error(`Unsupported filter "${op}"`);
    }
  }
  return true;
}

function matches(session: Session, modelName: string, row: WorkingRow, where: any): boolean {
  if (!where) return true;
  const model = MODELS[modelName];

  for (const [key, cond] of Object.entries(where)) {
    if (cond === undefined) continue;

    if (key === "AND") {
      if (!asArray(cond as any).every((w) => matches(session, modelName, row, w))) return false;
    } else if (key === "OR") {
      const list = asArray(cond as any);
      if (!list.some((w) => matches(session, modelName, row, w))) return false;
    } else if (key === "NOT") {
      if (asArray(cond as any).some((w) => matches(session, modelName, row, w))) return false;
    } else if (key in model.relations) {
      const rel = model.relations[key];
      const target = MODELS[rel.model];
      if (rel.kind === "one") {
        const fk = row.values[rel.field];
        const related = fk == null ? undefined : session.index(rel.model, target.pk).get(fk)?.[0];
        const c = cond as any;
        if (c === null || (isPlainObject(c) && "is" in c && c.is === null)) {
          if (related) return false;
        } else if (isPlainObject(c) && "isNot" in c) {
          if (c.isNot === null ? !related : related && matches(session, rel.model, related, c.isNot)) return false;
        } else {
          const filter = isPlainObject(c) && "is" in c ? c.is : c;
          if (!related || !matches(session, rel.model, related, filter)) return false;
        }
      } else {
        const children = session.index(rel.model, rel.field).get(row.values[model.pk]) || [];
        const c = cond as any;
        if ("some" in c && !children.some((ch) => matches(session, rel.model, ch, c.some))) return false;
        if ("none" in c && children.some((ch) => matches(session, rel.model, ch, c.none))) return false;
        if ("every" in c && !children.every((ch) => matches(session, rel.model, ch, c.every))) return false;
      }
    } else if (key in model.fields) {
      if (!matchField(row.values[key], cond)) return false;
    } else {
      throw new Error(`Unknown field "${key}" in where clause for ${model.name}`);
    }
  }
  return true;
}

function compareValues(a: unknown, b: unknown): number {
  const x = norm(a ?? null) as any;
  const y = norm(b ?? null) as any;
  if (x === null && y === null) return 0;
  // Like Postgres, NULL sorts as the largest value (last ascending, first descending).
  if (x === null) return 1;
  if (y === null) return -1;
  if (typeof x === "string" && typeof y === "string") return x.localeCompare(y);
  return x < y ? -1 : x > y ? 1 : 0;
}

function sortRows(model: ModelDef, rows: WorkingRow[], orderBy: any): WorkingRow[] {
  const specs = asArray(orderBy).flatMap((o) => Object.entries(o as Record<string, any>));
  if (specs.length === 0) return rows;
  for (const [field] of specs) {
    if (!(field in model.fields)) throw new Error(`Can only order by scalar fields; "${field}" is not one on ${model.name}`);
  }
  return [...rows].sort((a, b) => {
    for (const [field, dirSpec] of specs) {
      const dir = (isPlainObject(dirSpec) ? dirSpec.sort : dirSpec) === "desc" ? -1 : 1;
      const c = compareValues(a.values[field], b.values[field]);
      if (c !== 0) return c * dir;
    }
    return 0;
  });
}

// ---------------------------------------------------------------------------
// Result shaping (select / include / _count)
// ---------------------------------------------------------------------------

function project(session: Session, modelName: string, row: WorkingRow, args: any): any {
  const model = MODELS[modelName];
  const out: Record<string, unknown> = {};
  const select = args?.select;
  const include = args?.include;

  const addExtra = (key: string, spec: any) => {
    if (key === "_count") {
      const countSpec = spec === true ? { select: Object.fromEntries(Object.keys(model.relations).map((r) => [r, true])) } : spec;
      const counts: Record<string, number> = {};
      for (const [relName, relSpec] of Object.entries<any>(countSpec?.select || {})) {
        const rel = model.relations[relName];
        if (!rel || rel.kind !== "many") throw new Error(`Cannot count "${relName}" on ${model.name}`);
        const children = session.index(rel.model, rel.field).get(row.values[model.pk]) || [];
        counts[relName] = isPlainObject(relSpec) && relSpec.where
          ? children.filter((c) => matches(session, rel.model, c, relSpec.where)).length
          : children.length;
      }
      out._count = counts;
      return;
    }
    const rel = model.relations[key];
    if (!rel) throw new Error(`Unknown field "${key}" on ${model.name}`);
    const subArgs = spec === true ? {} : spec;
    if (rel.kind === "one") {
      const fk = row.values[rel.field];
      const related = fk == null ? undefined : session.index(rel.model, MODELS[rel.model].pk).get(fk)?.[0];
      out[key] = related ? project(session, rel.model, related, subArgs) : null;
    } else {
      const children = session.index(rel.model, rel.field).get(row.values[model.pk]) || [];
      out[key] = shapeRows(session, rel.model, children, subArgs);
    }
  };

  if (select) {
    for (const [key, spec] of Object.entries(select)) {
      if (!spec) continue;
      if (key in model.fields) out[key] = cloneValue(row.values[key]);
      else addExtra(key, spec);
    }
  } else {
    for (const key of Object.keys(model.fields)) out[key] = cloneValue(row.values[key]);
    for (const [key, spec] of Object.entries(include || {})) if (spec) addExtra(key, spec);
  }
  return out;
}

/** where -> orderBy -> skip/take -> select/include, applied to a list of rows. */
function shapeRows(session: Session, modelName: string, rows: WorkingRow[], args: any): any[] {
  const model = MODELS[modelName];
  let list = args?.where ? rows.filter((r) => matches(session, modelName, r, args.where)) : rows;
  list = sortRows(model, list, args?.orderBy);
  if (args?.skip) list = list.slice(args.skip);
  if (args?.take !== undefined) list = list.slice(0, args.take);
  return list.map((r) => project(session, modelName, r, args));
}

/** Which tables an operation touches, so they can all be fetched in one API call. */
function neededModels(modelName: string, action: string, args: any): Set<string> {
  const set = new Set<string>([modelName]);
  if (action === "delete" || action === "deleteMany") {
    MODEL_NAMES.forEach((n) => set.add(n));
    return set;
  }

  const walkWhere = (name: string, where: any) => {
    if (!isPlainObject(where)) return;
    for (const [key, cond] of Object.entries(where)) {
      if (key === "AND" || key === "OR" || key === "NOT") asArray(cond as any).forEach((w) => walkWhere(name, w));
      else if (key in MODELS[name].relations) {
        const rel = MODELS[name].relations[key];
        set.add(rel.model);
        if (isPlainObject(cond)) {
          for (const inner of [cond, (cond as any).is, (cond as any).isNot, (cond as any).some, (cond as any).none, (cond as any).every]) {
            walkWhere(rel.model, inner);
          }
        }
      }
    }
  };
  const walkArgs = (name: string, a: any) => {
    if (!isPlainObject(a)) return;
    walkWhere(name, a.where);
    for (const group of [a.select, a.include]) {
      for (const [key, spec] of Object.entries(group || {})) {
        if (key === "_count") {
          for (const relName of Object.keys((spec as any)?.select || MODELS[name].relations)) {
            const rel = MODELS[name].relations[relName];
            if (rel) set.add(rel.model);
          }
        } else if (key in MODELS[name].relations) {
          const rel = MODELS[name].relations[key];
          set.add(rel.model);
          walkArgs(rel.model, spec);
        }
      }
    }
  };
  const walkData = (name: string, data: any) => {
    for (const [key, spec] of Object.entries(data || {})) {
      const rel = MODELS[name].relations[key];
      if (rel && isPlainObject(spec)) {
        set.add(rel.model);
        asArray((spec as any).create).forEach((d) => walkData(rel.model, d));
      }
    }
  };

  walkArgs(modelName, args);
  walkData(modelName, args?.data);
  walkData(modelName, args?.create);
  walkData(modelName, args?.update);
  return set;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function assertUnique(session: Session, model: ModelDef, values: Record<string, unknown>, except?: WorkingRow) {
  for (const [name, field] of Object.entries(model.fields)) {
    if (!field.unique) continue;
    const v = values[name];
    if (v === null || v === undefined) continue;
    const clash = (session.index(model.name, name).get(v) || []).some((r) => r !== except);
    if (clash) {
      throw new DbError("P2002", `Unique constraint failed on the fields: (\`${name}\`)`);
    }
  }
}

function createRow(session: Session, modelName: string, data: Record<string, any>): WorkingRow {
  const model = MODELS[modelName];
  const stamp = nowStamp();
  const values: Record<string, unknown> = {};

  for (const key of Object.keys(data)) {
    if (!(key in model.fields) && !(key in model.relations)) {
      throw new DbError("P2009", `Unknown argument "${key}" for ${model.name}.create`);
    }
  }

  for (const [name, field] of Object.entries(model.fields)) {
    let v = data[name];
    if (v === undefined) {
      if (field.default === "cuid") v = newId();
      else if (field.default === "now") v = stamp;
      else if (field.default !== undefined) v = field.default;
      else if (field.optional) v = null;
      else throw new DbError("P2012", `Missing required value for ${model.name}.${name}`);
    }
    values[name] = coerce(model, name, field, v);
  }

  assertUnique(session, model, values);
  const row = session.insert(modelName, values);

  for (const [key, spec] of Object.entries<any>(data)) {
    const rel = model.relations[key];
    if (!rel || spec === undefined) continue;
    if (rel.kind !== "many" || !isPlainObject(spec) || Object.keys(spec).some((k) => k !== "create")) {
      throw new Error(`Only nested "create" on to-many relations is supported (${model.name}.${key})`);
    }
    for (const child of asArray(spec.create)) {
      createRow(session, rel.model, { ...child, [rel.field]: values[model.pk] });
    }
  }
  return row;
}

function updateRow(session: Session, modelName: string, row: WorkingRow, data: Record<string, any>) {
  const model = MODELS[modelName];
  const changes: Record<string, unknown> = {};
  const nested: [string, any][] = [];

  for (const [key, raw] of Object.entries(data || {})) {
    if (raw === undefined) continue;
    if (key in model.relations) {
      nested.push([key, raw]);
      continue;
    }
    const field = model.fields[key];
    if (!field) throw new DbError("P2009", `Unknown argument "${key}" for ${model.name}.update`);

    let v = raw;
    if (isPlainObject(v)) {
      if ("set" in v) v = v.set;
      else if ("increment" in v) v = Number(row.values[key] ?? 0) + Number(v.increment);
      else if ("decrement" in v) v = Number(row.values[key] ?? 0) - Number(v.decrement);
      else throw new DbError("P2009", `Unsupported update operation on ${model.name}.${key}`);
    }
    changes[key] = coerce(model, key, field, v);
  }

  assertUnique(session, model, { ...row.values, ...changes }, row);
  Object.assign(row.values, changes);
  for (const [name, field] of Object.entries(model.fields)) {
    if (field.updatedAt) row.values[name] = nowStamp();
  }
  session.touch(modelName, row);

  for (const [key, spec] of nested) {
    const rel = model.relations[key];
    if (rel.kind !== "many" || !isPlainObject(spec) || Object.keys(spec).some((k) => k !== "create")) {
      throw new Error(`Only nested "create" on to-many relations is supported (${model.name}.${key})`);
    }
    for (const child of asArray(spec.create)) {
      createRow(session, rel.model, { ...child, [rel.field]: row.values[model.pk] });
    }
  }
}

function deleteRow(session: Session, modelName: string, row: WorkingRow) {
  const pk = row.values[MODELS[modelName].pk];

  // Apply the same referential actions the database used to enforce.
  for (const child of Object.values(MODELS)) {
    for (const rel of Object.values(child.relations)) {
      if (rel.kind !== "one" || rel.model !== modelName) continue;
      const dependents = [...(session.index(child.name, rel.field).get(pk) || [])];
      if (dependents.length === 0) continue;

      if (rel.onDelete === "Restrict") {
        throw new DbError(
          "P2003",
          `Cannot delete ${modelName}: ${dependents.length} ${child.name} record(s) still reference it.`
        );
      }
      for (const dep of dependents) {
        if (rel.onDelete === "Cascade") {
          deleteRow(session, child.name, dep);
        } else {
          dep.values[rel.field] = null;
          session.touch(child.name, dep);
        }
      }
    }
  }
  session.remove(modelName, row);
}

const notFound = (what: string) =>
  new DbError("P2025", `An operation failed because it depends on one or more records that were required but not found. ${what}`);

// ---------------------------------------------------------------------------
// Operation dispatch
// ---------------------------------------------------------------------------

const READ_ACTIONS = new Set(["findMany", "findFirst", "findUnique", "findUniqueOrThrow", "count"]);

async function execute(session: Session, modelName: string, action: string, args: any): Promise<any> {
  args = args || {};
  await session.ensure(neededModels(modelName, action, args));

  const find = () => session.rows(modelName).filter((r) => matches(session, modelName, r, args.where));

  switch (action) {
    case "findMany":
      return shapeRows(session, modelName, session.rows(modelName), args);

    case "findFirst":
    case "findUnique":
    case "findUniqueOrThrow": {
      const [first] = shapeRows(session, modelName, find(), { ...args, where: undefined, take: undefined });
      if (!first && action === "findUniqueOrThrow") throw notFound("No record found.");
      return first ?? null;
    }

    case "count":
      return find().length;

    case "create":
      return project(session, modelName, createRow(session, modelName, args.data), args);

    case "createMany": {
      let count = 0;
      for (const data of asArray(args.data)) {
        try {
          createRow(session, modelName, data as any);
          count++;
        } catch (error) {
          if (!(args.skipDuplicates && (error as DbError).code === "P2002")) throw error;
        }
      }
      return { count };
    }

    case "update": {
      const row = find()[0];
      if (!row) throw notFound("Record to update not found.");
      updateRow(session, modelName, row, args.data);
      return project(session, modelName, row, args);
    }

    case "updateMany": {
      const rows = find();
      rows.forEach((row) => updateRow(session, modelName, row, args.data));
      return { count: rows.length };
    }

    case "upsert": {
      const row = find()[0];
      if (row) {
        updateRow(session, modelName, row, args.update);
        return project(session, modelName, row, args);
      }
      return project(session, modelName, createRow(session, modelName, args.create), args);
    }

    case "delete": {
      const row = find()[0];
      if (!row) throw notFound("Record to delete does not exist.");
      const snapshot = project(session, modelName, row, args);
      deleteRow(session, modelName, row);
      return snapshot;
    }

    case "deleteMany": {
      const rows = find();
      rows.forEach((row) => deleteRow(session, modelName, row));
      return { count: rows.length };
    }

    default:
      throw new Error(`Unsupported operation: ${action}`);
  }
}

async function runOperation(modelName: string, action: string, args: any): Promise<any> {
  const current = als.getStore();
  if (current) return current.run(() => execute(current, modelName, action, args));

  if (READ_ACTIONS.has(action)) {
    return execute(new Session(false), modelName, action, args);
  }

  return withWriteLock(async () => {
    const session = new Session(true);
    const result = await execute(session, modelName, action, args);
    await session.commit();
    return result;
  });
}

function runBatch<R>(fn: () => Promise<R>, preload: Iterable<string> = []): Promise<R> {
  const existing = als.getStore();
  if (existing) return existing.ensure(preload).then(fn);
  return withWriteLock(async () => {
    const session = new Session(true);
    // Fetch every table the batch is known to need in a single API request.
    await session.ensure(preload);
    const result = await als.run(session, fn);
    await session.commit();
    return result;
  });
}

// ---------------------------------------------------------------------------
// Public client
// ---------------------------------------------------------------------------

/** Lazy like Prisma's: nothing runs until awaited (or handed to $transaction). */
export class DbPromise<R> implements PromiseLike<R> {
  readonly [Symbol.toStringTag] = "DbPromise";
  private promise?: Promise<R>;
  constructor(
    private readonly start: () => Promise<R>,
    /** Tables this operation reads, so a transaction can fetch them all at once. */
    readonly needs: Set<string> = new Set()
  ) {}

  exec(): Promise<R> {
    return (this.promise ??= this.start());
  }
  then<A = R, B = never>(
    onfulfilled?: ((value: R) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: any) => B | PromiseLike<B>) | null
  ): Promise<A | B> {
    return this.exec().then(onfulfilled, onrejected);
  }
  catch<B = never>(onrejected?: ((reason: any) => B | PromiseLike<B>) | null): Promise<R | B> {
    return this.exec().catch(onrejected);
  }
  finally(onfinally?: (() => void) | null): Promise<R> {
    return this.exec().finally(onfinally);
  }
}

export type Row<M, Rel = T.NoRelations> = M & Rel & { [key: string]: any };

interface Delegate<M, Rel = T.NoRelations> {
  findMany(args?: any): DbPromise<Row<M, Rel>[]>;
  findFirst(args?: any): DbPromise<Row<M, Rel> | null>;
  findUnique(args: any): DbPromise<Row<M, Rel> | null>;
  findUniqueOrThrow(args: any): DbPromise<Row<M, Rel>>;
  create(args: any): DbPromise<Row<M, Rel>>;
  createMany(args: any): DbPromise<{ count: number }>;
  update(args: any): DbPromise<Row<M, Rel>>;
  updateMany(args: any): DbPromise<{ count: number }>;
  upsert(args: any): DbPromise<Row<M, Rel>>;
  delete(args: any): DbPromise<Row<M, Rel>>;
  deleteMany(args?: any): DbPromise<{ count: number }>;
  count(args?: any): DbPromise<number>;
}

export interface DbClient {
  user: Delegate<T.User, T.UserRelations>;
  customer: Delegate<T.Customer, T.CustomerRelations>;
  carrier: Delegate<T.Carrier, T.CarrierRelations>;
  driver: Delegate<T.Driver, T.DriverRelations>;
  load: Delegate<T.Load, T.LoadRelations>;
  trackingUpdate: Delegate<T.TrackingUpdate, T.TrackingUpdateRelations>;
  rateConfirmation: Delegate<T.RateConfirmation, T.RateConfirmationRelations>;
  invoice: Delegate<T.Invoice, T.InvoiceRelations>;
  settlement: Delegate<T.Settlement, T.SettlementRelations>;
  sequenceCounter: Delegate<T.SequenceCounter>;

  /** Runs the operations against one snapshot and writes them together in a single Sheets request. */
  $transaction<Ops extends readonly DbPromise<any>[]>(
    ops: [...Ops]
  ): Promise<{ [K in keyof Ops]: Ops[K] extends DbPromise<infer R> ? R : never }>;
  $transaction<R>(fn: (tx: DbClient) => Promise<R>): Promise<R>;
  /**
   * Like $transaction, for code that makes many calls: reads once, writes once.
   * `preload` lists model names (e.g. "load") to fetch up front in one request.
   */
  $batch<R>(fn: () => Promise<R>, preload?: string[]): Promise<R>;
  $disconnect(): Promise<void>;
}

const ACTIONS = [
  "findMany",
  "findFirst",
  "findUnique",
  "findUniqueOrThrow",
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "count",
] as const;

function createClient(): DbClient {
  const client: any = {
    async $transaction(arg: unknown) {
      if (typeof arg === "function") return runBatch(() => (arg as (tx: unknown) => Promise<unknown>)(client));
      const ops = arg as DbPromise<unknown>[];
      return runBatch(
        async () => {
          const results: unknown[] = [];
          for (const op of ops) results.push(await op.exec());
          return results;
        },
        ops.flatMap((op) => [...op.needs])
      );
    },
    $batch: (fn: () => Promise<unknown>, preload?: string[]) => runBatch(fn, preload),
    async $disconnect() {},
  };

  for (const modelName of MODEL_NAMES) {
    const delegate: Record<string, unknown> = {};
    for (const action of ACTIONS) {
      delegate[action] = (args?: unknown) =>
        new DbPromise(() => runOperation(modelName, action, args), neededModels(modelName, action, args));
    }
    client[modelName] = delegate;
  }
  return client as DbClient;
}

const globalForDb = globalThis as unknown as { __sheetsDb?: DbClient };

export const db: DbClient = globalForDb.__sheetsDb ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.__sheetsDb = db;
