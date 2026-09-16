import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadSchema } from "@/lib/validation";
import { requireSession, handleApiError, emptyToNull } from "@/lib/api";
import { nextSequenceNumber } from "@/lib/sequence";

export async function GET(req: NextRequest) {
  const { response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER"]);
  if (response) return response;

  const status = req.nextUrl.searchParams.get("status");

  const loads = await prisma.load.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { createdAt: "desc" },
    include: { customer: true, carrier: true, driver: true },
  });
  return NextResponse.json(loads);
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER"]);
  if (response) return response;

  try {
    const body = emptyToNull(await req.json());
    const data = loadSchema.parse(body);

    const referenceNumber = data.referenceNumber || (await nextSequenceNumber("LD"));

    const load = await prisma.load.create({
      data: {
        referenceNumber,
        status: data.status || "BOOKED",
        customerId: data.customerId || null,
        carrierId: data.carrierId || null,
        driverId: data.driverId || null,
        pickupLocation: data.pickupLocation,
        pickupDate: new Date(data.pickupDate),
        deliveryLocation: data.deliveryLocation,
        deliveryDate: new Date(data.deliveryDate),
        commodity: data.commodity || null,
        weightLbs: data.weightLbs ?? null,
        equipment: data.equipment || null,
        customerRate: data.customerRate,
        carrierRate: data.carrierRate,
        notes: data.notes || null,
        createdById: session!.user.id,
        trackingUpdates: {
          create: [
            {
              status: data.status || "BOOKED",
              location: data.pickupLocation,
              note: "Load created.",
            },
          ],
        },
      },
      include: { customer: true, carrier: true, driver: true },
    });

    return NextResponse.json(load, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
