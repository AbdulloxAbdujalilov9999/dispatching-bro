import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@dispatchplatform.com" },
    update: {},
    create: {
      name: "Alex Morgan",
      email: "admin@dispatchplatform.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "dispatcher@dispatchplatform.com" },
    update: {},
    create: {
      name: "Jamie Rivera",
      email: "dispatcher@dispatchplatform.com",
      passwordHash,
      role: "DISPATCHER",
    },
  });

  // Real owner account. Re-running the seed always re-asserts ADMIN + active
  // for this address (in case it's ever changed by mistake), but never
  // overwrites the password once it's been set by a real login.
  const ownerPasswordHash = await bcrypt.hash("Haulwise2026!", 10);
  await prisma.user.upsert({
    where: { email: "abdujalilov7707@gmail.com" },
    update: { role: "ADMIN", active: true },
    create: {
      name: "Abdullox Abdujalilov",
      email: "abdujalilov7707@gmail.com",
      passwordHash: ownerPasswordHash,
      role: "ADMIN",
      active: true,
    },
  });

  const customerA = await prisma.customer.create({
    data: {
      name: "Northwind Distribution",
      contactName: "Pat Chen",
      email: "pat@northwind.example",
      phone: "555-201-3344",
      addressLine: "4500 Freight Way",
      city: "Chicago",
      state: "IL",
      zip: "60607",
    },
  });

  const customerB = await prisma.customer.create({
    data: {
      name: "Summit Retail Group",
      contactName: "Morgan Lee",
      email: "morgan@summitretail.example",
      phone: "555-882-1290",
      addressLine: "12 Commerce Blvd",
      city: "Dallas",
      state: "TX",
      zip: "75201",
    },
  });

  const carrierA = await prisma.carrier.create({
    data: {
      name: "Redline Freight LLC",
      mcNumber: "MC-558211",
      dotNumber: "DOT-2201938",
      contactName: "Sam Walker",
      email: "sam@redlinefreight.example",
      phone: "555-410-7788",
      insuranceProvider: "Progressive Commercial",
      insuranceExpiry: new Date("2026-05-01"),
      status: "ACTIVE",
    },
  });

  const carrierB = await prisma.carrier.create({
    data: {
      name: "Blue Horizon Logistics",
      mcNumber: "MC-771002",
      dotNumber: "DOT-3390211",
      contactName: "Robin Diaz",
      email: "robin@bluehorizon.example",
      phone: "555-663-9021",
      insuranceProvider: "Sentry Insurance",
      insuranceExpiry: new Date("2026-01-15"),
      status: "ACTIVE",
    },
  });

  const driverA = await prisma.driver.create({
    data: {
      name: "Marcus Reed",
      phone: "555-333-1122",
      email: "marcus.reed@example.com",
      licenseNumber: "IL-DL-88213",
      licenseExpiry: new Date("2027-08-01"),
      truckNumber: "TRK-104",
      trailerNumber: "TRL-204",
      status: "ACTIVE",
      carrierId: carrierA.id,
    },
  });

  const driverB = await prisma.driver.create({
    data: {
      name: "Elena Cho",
      phone: "555-777-4433",
      email: "elena.cho@example.com",
      licenseNumber: "TX-DL-55219",
      licenseExpiry: new Date("2026-11-01"),
      truckNumber: "TRK-220",
      trailerNumber: "TRL-330",
      status: "ACTIVE",
      carrierId: carrierB.id,
    },
  });

  const load1 = await prisma.load.create({
    data: {
      referenceNumber: "LD-10001",
      status: "IN_TRANSIT",
      customerId: customerA.id,
      carrierId: carrierA.id,
      driverId: driverA.id,
      pickupLocation: "Chicago, IL",
      pickupDate: new Date("2026-09-10T08:00:00Z"),
      deliveryLocation: "Columbus, OH",
      deliveryDate: new Date("2026-09-11T17:00:00Z"),
      commodity: "Packaged Foods",
      weightLbs: 42000,
      equipment: "Dry Van",
      customerRate: 2200,
      carrierRate: 1850,
      createdById: admin.id,
      trackingUpdates: {
        create: [
          { status: "BOOKED", location: "Chicago, IL", note: "Load booked and confirmed." },
          { status: "DISPATCHED", location: "Chicago, IL", note: "Driver dispatched to pickup." },
          { status: "IN_TRANSIT", location: "Indianapolis, IN", note: "In transit, on schedule." },
        ],
      },
    },
  });

  const load2 = await prisma.load.create({
    data: {
      referenceNumber: "LD-10002",
      status: "DELIVERED",
      customerId: customerB.id,
      carrierId: carrierB.id,
      driverId: driverB.id,
      pickupLocation: "Dallas, TX",
      pickupDate: new Date("2026-09-05T09:00:00Z"),
      deliveryLocation: "Austin, TX",
      deliveryDate: new Date("2026-09-05T18:00:00Z"),
      commodity: "Retail Goods",
      weightLbs: 18000,
      equipment: "Reefer",
      customerRate: 1100,
      carrierRate: 900,
      createdById: admin.id,
      trackingUpdates: {
        create: [
          { status: "BOOKED", location: "Dallas, TX" },
          { status: "DISPATCHED", location: "Dallas, TX" },
          { status: "IN_TRANSIT", location: "Waco, TX" },
          { status: "DELIVERED", location: "Austin, TX", note: "Delivered on time, POD received." },
        ],
      },
    },
  });

  const load3 = await prisma.load.create({
    data: {
      referenceNumber: "LD-10003",
      status: "BOOKED",
      customerId: customerA.id,
      pickupLocation: "Milwaukee, WI",
      pickupDate: new Date("2026-09-18T08:00:00Z"),
      deliveryLocation: "Detroit, MI",
      deliveryDate: new Date("2026-09-19T14:00:00Z"),
      commodity: "Auto Parts",
      weightLbs: 30000,
      equipment: "Flatbed",
      customerRate: 1750,
      carrierRate: 0,
      createdById: admin.id,
      trackingUpdates: {
        create: [{ status: "BOOKED", location: "Milwaukee, WI", note: "Awaiting carrier assignment." }],
      },
    },
  });

  await prisma.rateConfirmation.create({
    data: {
      rcNumber: "RC-5001",
      loadId: load1.id,
      carrierId: carrierA.id,
      rateAmount: 1850,
      status: "SIGNED",
      sentAt: new Date("2026-09-09T12:00:00Z"),
      signedAt: new Date("2026-09-09T15:30:00Z"),
      terms: "Payment due Net 30 from receipt of signed BOL and invoice.",
    },
  });

  await prisma.rateConfirmation.create({
    data: {
      rcNumber: "RC-5002",
      loadId: load2.id,
      carrierId: carrierB.id,
      rateAmount: 900,
      status: "SIGNED",
      sentAt: new Date("2026-09-04T10:00:00Z"),
      signedAt: new Date("2026-09-04T11:15:00Z"),
      terms: "Payment due Net 30 from receipt of signed BOL and invoice.",
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-9001",
      loadId: load2.id,
      customerId: customerB.id,
      amount: 1100,
      status: "SENT",
      dueDate: new Date("2026-10-05T00:00:00Z"),
    },
  });

  await prisma.settlement.create({
    data: {
      loadId: load2.id,
      carrierId: carrierB.id,
      amount: 900,
      status: "APPROVED",
    },
  });

  console.log("Seed complete.");
  console.log("Demo login: admin@dispatchplatform.com / password123");
  console.log("Owner admin login: abdujalilov7707@gmail.com / Haulwise2026!  (change this password after first login)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
