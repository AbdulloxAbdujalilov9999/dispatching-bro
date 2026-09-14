import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  addressLine: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const carrierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mcNumber: z.string().optional().nullable(),
  dotNumber: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  insuranceProvider: z.string().optional().nullable(),
  insuranceExpiry: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING_APPROVAL"]).optional(),
  notes: z.string().optional().nullable(),
});

export const driverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  licenseNumber: z.string().optional().nullable(),
  licenseExpiry: z.string().optional().nullable(),
  truckNumber: z.string().optional().nullable(),
  trailerNumber: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).optional(),
  carrierId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const loadSchema = z.object({
  referenceNumber: z.string().optional(),
  status: z
    .enum(["BOOKED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "INVOICED", "CANCELLED"])
    .optional(),
  customerId: z.string().optional().nullable(),
  carrierId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  pickupLocation: z.string().min(1, "Pickup location is required"),
  pickupDate: z.string().min(1, "Pickup date is required"),
  deliveryLocation: z.string().min(1, "Delivery location is required"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  commodity: z.string().optional().nullable(),
  weightLbs: z.coerce.number().optional().nullable(),
  equipment: z.string().optional().nullable(),
  customerRate: z.coerce.number().min(0).default(0),
  carrierRate: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export const trackingUpdateSchema = z.object({
  status: z.enum(["BOOKED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "INVOICED", "CANCELLED"]),
  location: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const rateConfirmationSchema = z.object({
  loadId: z.string().min(1),
  carrierId: z.string().min(1),
  rateAmount: z.coerce.number().min(0),
  terms: z.string().optional().nullable(),
});

export const invoiceSchema = z.object({
  loadId: z.string().min(1),
  customerId: z.string().min(1),
  amount: z.coerce.number().min(0),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const settlementSchema = z.object({
  loadId: z.string().min(1),
  carrierId: z.string().min(1),
  amount: z.coerce.number().min(0),
  notes: z.string().optional().nullable(),
});
