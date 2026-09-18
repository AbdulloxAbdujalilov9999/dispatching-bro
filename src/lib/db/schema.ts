// Table definitions for the Google Sheets backend: one sheet tab per model,
// one column per field, header names in row 1. This is the runtime twin of the
// TypeScript types in ./types.ts (and of the old prisma/schema.prisma).

export type FieldType = "string" | "int" | "decimal" | "boolean" | "datetime";

export interface FieldDef {
  type: FieldType;
  optional?: boolean;
  /** "cuid" = generated id, "now" = current timestamp, otherwise a literal default. */
  default?: unknown;
  /** Refreshed with the current time on every update. */
  updatedAt?: boolean;
  unique?: boolean;
  /** Allowed values for enum-like string columns. */
  values?: readonly string[];
}

export interface RelationDef {
  model: string;
  /**
   * "one":  `field` is the foreign-key column on THIS model pointing at the
   *         target's primary key.
   * "many": `field` is the foreign-key column on the TARGET model pointing
   *         back at this model's primary key.
   */
  kind: "one" | "many";
  field: string;
  /** Only meaningful on "one" relations: what happens to this row when the parent is deleted. */
  onDelete?: "Cascade" | "SetNull" | "Restrict";
}

export interface ModelDef {
  name: string;
  /** Sheet (tab) title. */
  sheet: string;
  pk: string;
  fields: Record<string, FieldDef>;
  relations: Record<string, RelationDef>;
}

const ROLE = ["ADMIN", "MANAGER", "DISPATCHER", "ACCOUNTING", "HR"] as const;
const LOAD_STATUS = ["BOOKED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "INVOICED", "CANCELLED"] as const;
const CARRIER_STATUS = ["ACTIVE", "INACTIVE", "PENDING_APPROVAL"] as const;
const DRIVER_STATUS = ["ACTIVE", "INACTIVE", "ON_LEAVE"] as const;
const RC_STATUS = ["DRAFT", "SENT", "SIGNED", "VOID"] as const;
const INVOICE_STATUS = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"] as const;
const SETTLEMENT_STATUS = ["PENDING", "APPROVED", "PAID"] as const;

const id: FieldDef = { type: "string", default: "cuid", unique: true };
const createdAt: FieldDef = { type: "datetime", default: "now" };
const updatedAt: FieldDef = { type: "datetime", default: "now", updatedAt: true };
const str: FieldDef = { type: "string", optional: true };
const req: FieldDef = { type: "string" };
const date: FieldDef = { type: "datetime", optional: true };

export const MODELS: Record<string, ModelDef> = {
  user: {
    name: "user",
    sheet: "Users",
    pk: "id",
    fields: {
      id,
      name: req,
      email: { type: "string", unique: true },
      passwordHash: req,
      role: { type: "string", default: "DISPATCHER", values: ROLE },
      active: { type: "boolean", default: true },
      createdAt,
      updatedAt,
    },
    relations: {
      loadsCreated: { kind: "many", model: "load", field: "createdById" },
    },
  },

  customer: {
    name: "customer",
    sheet: "Customers",
    pk: "id",
    fields: {
      id,
      name: req,
      contactName: str,
      email: str,
      phone: str,
      addressLine: str,
      city: str,
      state: str,
      zip: str,
      notes: str,
      createdAt,
      updatedAt,
    },
    relations: {
      loads: { kind: "many", model: "load", field: "customerId" },
      invoices: { kind: "many", model: "invoice", field: "customerId" },
    },
  },

  carrier: {
    name: "carrier",
    sheet: "Carriers",
    pk: "id",
    fields: {
      id,
      name: req,
      mcNumber: str,
      dotNumber: str,
      contactName: str,
      email: str,
      phone: str,
      insuranceProvider: str,
      insuranceExpiry: date,
      status: { type: "string", default: "ACTIVE", values: CARRIER_STATUS },
      notes: str,
      createdAt,
      updatedAt,
    },
    relations: {
      drivers: { kind: "many", model: "driver", field: "carrierId" },
      loads: { kind: "many", model: "load", field: "carrierId" },
      rateConfirmations: { kind: "many", model: "rateConfirmation", field: "carrierId" },
      settlements: { kind: "many", model: "settlement", field: "carrierId" },
    },
  },

  driver: {
    name: "driver",
    sheet: "Drivers",
    pk: "id",
    fields: {
      id,
      name: req,
      phone: str,
      email: str,
      licenseNumber: str,
      licenseExpiry: date,
      truckNumber: str,
      trailerNumber: str,
      status: { type: "string", default: "ACTIVE", values: DRIVER_STATUS },
      notes: str,
      carrierId: str,
      createdAt,
      updatedAt,
    },
    relations: {
      carrier: { kind: "one", model: "carrier", field: "carrierId", onDelete: "SetNull" },
      loads: { kind: "many", model: "load", field: "driverId" },
    },
  },

  load: {
    name: "load",
    sheet: "Loads",
    pk: "id",
    fields: {
      id,
      referenceNumber: { type: "string", unique: true },
      status: { type: "string", default: "BOOKED", values: LOAD_STATUS },
      customerId: str,
      carrierId: str,
      driverId: str,
      pickupLocation: req,
      pickupDate: { type: "datetime" },
      deliveryLocation: req,
      deliveryDate: { type: "datetime" },
      commodity: str,
      weightLbs: { type: "int", optional: true },
      equipment: str,
      customerRate: { type: "decimal", default: 0 },
      carrierRate: { type: "decimal", default: 0 },
      notes: str,
      createdById: str,
      createdAt,
      updatedAt,
    },
    relations: {
      customer: { kind: "one", model: "customer", field: "customerId", onDelete: "SetNull" },
      carrier: { kind: "one", model: "carrier", field: "carrierId", onDelete: "SetNull" },
      driver: { kind: "one", model: "driver", field: "driverId", onDelete: "SetNull" },
      createdBy: { kind: "one", model: "user", field: "createdById", onDelete: "SetNull" },
      trackingUpdates: { kind: "many", model: "trackingUpdate", field: "loadId" },
      rateConfirmations: { kind: "many", model: "rateConfirmation", field: "loadId" },
      invoices: { kind: "many", model: "invoice", field: "loadId" },
      settlements: { kind: "many", model: "settlement", field: "loadId" },
    },
  },

  trackingUpdate: {
    name: "trackingUpdate",
    sheet: "TrackingUpdates",
    pk: "id",
    fields: {
      id,
      loadId: req,
      status: { type: "string", values: LOAD_STATUS },
      location: str,
      note: str,
      createdAt,
    },
    relations: {
      load: { kind: "one", model: "load", field: "loadId", onDelete: "Cascade" },
    },
  },

  rateConfirmation: {
    name: "rateConfirmation",
    sheet: "RateConfirmations",
    pk: "id",
    fields: {
      id,
      rcNumber: { type: "string", unique: true },
      loadId: req,
      carrierId: req,
      rateAmount: { type: "decimal" },
      status: { type: "string", default: "DRAFT", values: RC_STATUS },
      pdfUrl: str,
      signedPdfUrl: str,
      sentAt: date,
      signedAt: date,
      terms: str,
      createdAt,
      updatedAt,
    },
    relations: {
      load: { kind: "one", model: "load", field: "loadId", onDelete: "Cascade" },
      carrier: { kind: "one", model: "carrier", field: "carrierId", onDelete: "Restrict" },
    },
  },

  invoice: {
    name: "invoice",
    sheet: "Invoices",
    pk: "id",
    fields: {
      id,
      invoiceNumber: { type: "string", unique: true },
      status: { type: "string", default: "DRAFT", values: INVOICE_STATUS },
      loadId: req,
      customerId: req,
      amount: { type: "decimal" },
      dueDate: date,
      paidAt: date,
      pdfUrl: str,
      notes: str,
      createdAt,
      updatedAt,
    },
    relations: {
      load: { kind: "one", model: "load", field: "loadId", onDelete: "Cascade" },
      customer: { kind: "one", model: "customer", field: "customerId", onDelete: "Restrict" },
    },
  },

  settlement: {
    name: "settlement",
    sheet: "Settlements",
    pk: "id",
    fields: {
      id,
      status: { type: "string", default: "PENDING", values: SETTLEMENT_STATUS },
      loadId: req,
      carrierId: req,
      amount: { type: "decimal" },
      paidAt: date,
      notes: str,
      createdAt,
      updatedAt,
    },
    relations: {
      load: { kind: "one", model: "load", field: "loadId", onDelete: "Cascade" },
      carrier: { kind: "one", model: "carrier", field: "carrierId", onDelete: "Restrict" },
    },
  },

  // Atomic counters behind the human-readable LD-/RC-/INV- reference numbers.
  sequenceCounter: {
    name: "sequenceCounter",
    sheet: "Counters",
    pk: "key",
    fields: {
      key: { type: "string", unique: true },
      value: { type: "int", default: 10000 },
    },
    relations: {},
  },
};

export const MODEL_NAMES = Object.keys(MODELS);
