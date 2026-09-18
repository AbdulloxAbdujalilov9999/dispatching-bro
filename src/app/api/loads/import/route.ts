import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import { parseLoadsWorkbook, type ParsedLoadRow } from "@/lib/excel/loads";
import { nextSequenceNumber, bumpSequenceFloor, parseSequenceSuffix } from "@/lib/sequence";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ROWS = 300;
const MAX_SIZE = 15 * 1024 * 1024; // 15MB
const VALID_STATUSES = new Set(["BOOKED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "INVOICED", "CANCELLED"]);

interface RowError {
  row: number;
  message: string;
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER"]);
  if (response) return response;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File is too large (max 15MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseLoadsWorkbook(buffer);
  } catch {
    return NextResponse.json({ error: "Couldn't read that file. Make sure it's a valid .xlsx spreadsheet." }, { status: 400 });
  }

  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (parsed.rows.length === 0) {
    return NextResponse.json({ error: "No data rows found in the spreadsheet." }, { status: 400 });
  }
  if (parsed.rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `That file has ${parsed.rows.length} rows. Import in batches of ${MAX_ROWS} or fewer.` },
      { status: 400 }
    );
  }

  let created = 0;
  let updated = 0;
  const errors: RowError[] = [];

  // Google Sheets allows only a limited number of requests per minute, so the
  // whole import runs as one batch: read each tab once, apply every row in
  // memory, then write all the changes back in a single request.
  await prisma.$batch(async () => {
    const [customers, carriers, drivers, existingLoads] = await Promise.all([
      prisma.customer.findMany({ select: { id: true, name: true } }),
      prisma.carrier.findMany({ select: { id: true, name: true } }),
      prisma.driver.findMany({ select: { id: true, name: true } }),
      prisma.load.findMany({
        where: { referenceNumber: { in: parsed.rows.map((r) => r.referenceNumber).filter(Boolean) } },
        select: { id: true, referenceNumber: true },
      }),
    ]);

    const customerMap = new Map(customers.map((c) => [c.name.toLowerCase(), c.id]));
    const carrierMap = new Map(carriers.map((c) => [c.name.toLowerCase(), c.id]));
    const driverMap = new Map(drivers.map((d) => [d.name.toLowerCase(), d.id]));
    const loadByRef = new Map(existingLoads.map((l) => [l.referenceNumber, l.id]));

    async function resolveByName(
      name: string,
      map: Map<string, string>,
      create: (name: string) => Promise<{ id: string }>
    ): Promise<string | null> {
      if (!name) return null;
      const key = name.toLowerCase();
      const existing = map.get(key);
      if (existing) return existing;
      const created = await create(name);
      map.set(key, created.id);
      return created.id;
    }

    for (const row of parsed.rows) {
      try {
        await importRow(row);
      } catch (err) {
        errors.push({ row: row.rowNumber, message: err instanceof Error ? err.message : "Import failed" });
      }
    }

    async function importRow(row: ParsedLoadRow) {
      if (!row.pickupLocation) throw new Error("Pickup Location is required");
      if (!row.deliveryLocation) throw new Error("Delivery Location is required");
      const pickupDate = row.pickupDate ? new Date(row.pickupDate) : null;
      const deliveryDate = row.deliveryDate ? new Date(row.deliveryDate) : null;
      if (!pickupDate || Number.isNaN(pickupDate.getTime())) throw new Error("Pickup Date is missing or invalid");
      if (!deliveryDate || Number.isNaN(deliveryDate.getTime())) throw new Error("Delivery Date is missing or invalid");

      const status = VALID_STATUSES.has(row.status) ? row.status : "BOOKED";

      const [customerId, carrierId, driverId] = await Promise.all([
        resolveByName(row.customer, customerMap, (name) => prisma.customer.create({ data: { name } })),
        resolveByName(row.carrier, carrierMap, (name) => prisma.carrier.create({ data: { name } })),
        resolveByName(row.driver, driverMap, (name) => prisma.driver.create({ data: { name } })),
      ]);

      const data = {
        status: status as any,
        customerId,
        carrierId,
        driverId,
        pickupLocation: row.pickupLocation,
        pickupDate,
        deliveryLocation: row.deliveryLocation,
        deliveryDate,
        commodity: row.commodity || null,
        weightLbs: row.weightLbs,
        equipment: row.equipment || null,
        customerRate: row.customerRate,
        carrierRate: row.carrierRate,
        notes: row.notes || null,
      };

      const existingId = row.referenceNumber ? loadByRef.get(row.referenceNumber) : undefined;

      if (existingId) {
        await prisma.load.update({ where: { id: existingId }, data });
        updated++;
        return;
      }

      const referenceNumber = row.referenceNumber || (await nextSequenceNumber("LD"));
      if (row.referenceNumber) {
        const suffix = parseSequenceSuffix(row.referenceNumber);
        if (suffix !== null) await bumpSequenceFloor("LD", suffix);
      }

      const load = await prisma.load.create({
        data: {
          ...data,
          referenceNumber,
          createdById: session!.user.id,
          trackingUpdates: { create: [{ status: status as any, location: row.pickupLocation, note: "Imported via Excel." }] },
        },
      });
      loadByRef.set(referenceNumber, load.id);
      created++;
    }
  }, ["customer", "carrier", "driver", "load", "trackingUpdate", "sequenceCounter"]);

  return NextResponse.json({
    totalRows: parsed.rows.length,
    created,
    updated,
    failed: errors.length,
    errors: errors.slice(0, 50),
  });
}
