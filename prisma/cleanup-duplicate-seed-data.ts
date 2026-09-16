/**
 * One-time cleanup for demo Customer/Carrier/Driver rows duplicated by a
 * `db:seed` re-run before the seed script was made idempotent.
 *
 * For each of the known demo names, keeps the oldest row (by createdAt) and
 * deletes any newer duplicates. Safe to run multiple times. Does nothing if
 * there are no duplicates left.
 *
 * Usage: npx tsx prisma/cleanup-duplicate-seed-data.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_DRIVER_NAMES = ["Marcus Reed", "Elena Cho"];
const DEMO_CARRIER_NAMES = ["Redline Freight LLC", "Blue Horizon Logistics"];
const DEMO_CUSTOMER_NAMES = ["Northwind Distribution", "Summit Retail Group"];

async function dedupe<T extends { id: string; name: string; createdAt: Date }>(
  label: string,
  findByName: (name: string) => Promise<T[]>,
  deleteById: (id: string) => Promise<unknown>,
  names: string[]
) {
  for (const name of names) {
    const rows = await findByName(name);
    if (rows.length <= 1) continue;

    const [keep, ...duplicates] = rows.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    for (const dup of duplicates) {
      await deleteById(dup.id);
      console.log(`Deleted duplicate ${label} "${name}" (id ${dup.id}), kept ${keep.id}`);
    }
  }
}

async function main() {
  // Drivers first (they reference carriers).
  await dedupe(
    "driver",
    (name) => prisma.driver.findMany({ where: { name } }),
    (id) => prisma.driver.delete({ where: { id } }),
    DEMO_DRIVER_NAMES
  );

  await dedupe(
    "carrier",
    (name) => prisma.carrier.findMany({ where: { name } }),
    (id) => prisma.carrier.delete({ where: { id } }),
    DEMO_CARRIER_NAMES
  );

  await dedupe(
    "customer",
    (name) => prisma.customer.findMany({ where: { name } }),
    (id) => prisma.customer.delete({ where: { id } }),
    DEMO_CUSTOMER_NAMES
  );

  console.log("Cleanup complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
