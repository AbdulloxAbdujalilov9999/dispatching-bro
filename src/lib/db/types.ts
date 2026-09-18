// Row and enum types for the Google Sheets-backed data layer. These mirror the
// tables that used to live in prisma/schema.prisma so the rest of the app keeps
// the same shapes (Load, Carrier, Role, ...). Money columns are plain numbers.

export type Role = "ADMIN" | "MANAGER" | "DISPATCHER" | "ACCOUNTING" | "HR";
export type LoadStatus = "BOOKED" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED" | "INVOICED" | "CANCELLED";
export type CarrierStatus = "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL";
export type DriverStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";
export type RcStatus = "DRAFT" | "SENT" | "SIGNED" | "VOID";
export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";
export type SettlementStatus = "PENDING" | "APPROVED" | "PAID";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Carrier {
  id: string;
  name: string;
  mcNumber: string | null;
  dotNumber: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  insuranceProvider: string | null;
  insuranceExpiry: Date | null;
  status: CarrierStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  licenseNumber: string | null;
  licenseExpiry: Date | null;
  truckNumber: string | null;
  trailerNumber: string | null;
  status: DriverStatus;
  notes: string | null;
  carrierId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Load {
  id: string;
  referenceNumber: string;
  status: LoadStatus;
  customerId: string | null;
  carrierId: string | null;
  driverId: string | null;
  pickupLocation: string;
  pickupDate: Date;
  deliveryLocation: string;
  deliveryDate: Date;
  commodity: string | null;
  weightLbs: number | null;
  equipment: string | null;
  customerRate: number;
  carrierRate: number;
  notes: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackingUpdate {
  id: string;
  loadId: string;
  status: LoadStatus;
  location: string | null;
  note: string | null;
  createdAt: Date;
}

export interface RateConfirmation {
  id: string;
  rcNumber: string;
  loadId: string;
  carrierId: string;
  rateAmount: number;
  status: RcStatus;
  pdfUrl: string | null;
  signedPdfUrl: string | null;
  sentAt: Date | null;
  signedAt: Date | null;
  terms: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  loadId: string;
  customerId: string;
  amount: number;
  dueDate: Date | null;
  paidAt: Date | null;
  pdfUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Settlement {
  id: string;
  status: SettlementStatus;
  loadId: string;
  carrierId: string;
  amount: number;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SequenceCounter {
  key: string;
  value: number;
}

// ---------------------------------------------------------------------------
// Relations. Query results can carry related rows (via `include`), typed
// loosely: to-one relations are `any` (possibly null), to-many are `any[]`.
// ---------------------------------------------------------------------------

export interface UserRelations {
  loadsCreated: any[];
  _count: any;
}
export interface CustomerRelations {
  loads: any[];
  invoices: any[];
  _count: any;
}
export interface CarrierRelations {
  drivers: any[];
  loads: any[];
  rateConfirmations: any[];
  settlements: any[];
  _count: any;
}
export interface DriverRelations {
  carrier: any;
  loads: any[];
  _count: any;
}
export interface LoadRelations {
  customer: any;
  carrier: any;
  driver: any;
  createdBy: any;
  trackingUpdates: any[];
  rateConfirmations: any[];
  invoices: any[];
  settlements: any[];
  _count: any;
}
export interface TrackingUpdateRelations {
  load: any;
}
export interface RateConfirmationRelations {
  load: any;
  carrier: any;
}
export interface InvoiceRelations {
  load: any;
  customer: any;
}
export interface SettlementRelations {
  load: any;
  carrier: any;
}
export type NoRelations = Record<never, never>;
