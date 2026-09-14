import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadSchema } from "@/lib/validation";
import { requireSession, handleApiError, emptyToNull } from "@/lib/api";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession();
  if (response) return response;

  const load = await prisma.load.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      carrier: true,
      driver: true,
      trackingUpdates: { orderBy: { createdAt: "desc" } },
      rateConfirmations: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      settlements: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(load);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession();
  if (response) return response;

  try {
    const body = emptyToNull(await req.json());
    const data = loadSchema.partial().parse(body);

    const existing = await prisma.load.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const statusChanged = data.status && data.status !== existing.status;

    const load = await prisma.load.update({
      where: { id: params.id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.customerId !== undefined ? { customerId: data.customerId } : {}),
        ...(data.carrierId !== undefined ? { carrierId: data.carrierId } : {}),
        ...(data.driverId !== undefined ? { driverId: data.driverId } : {}),
        ...(data.pickupLocation ? { pickupLocation: data.pickupLocation } : {}),
        ...(data.pickupDate ? { pickupDate: new Date(data.pickupDate) } : {}),
        ...(data.deliveryLocation ? { deliveryLocation: data.deliveryLocation } : {}),
        ...(data.deliveryDate ? { deliveryDate: new Date(data.deliveryDate) } : {}),
        ...(data.commodity !== undefined ? { commodity: data.commodity } : {}),
        ...(data.weightLbs !== undefined ? { weightLbs: data.weightLbs } : {}),
        ...(data.equipment !== undefined ? { equipment: data.equipment } : {}),
        ...(data.customerRate !== undefined ? { customerRate: data.customerRate } : {}),
        ...(data.carrierRate !== undefined ? { carrierRate: data.carrierRate } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(statusChanged
          ? {
              trackingUpdates: {
                create: {
                  status: data.status!,
                  location: data.pickupLocation || existing.pickupLocation,
                  note: `Status updated to ${data.status}.`,
                },
              },
            }
          : {}),
      },
      include: { customer: true, carrier: true, driver: true },
    });

    return NextResponse.json(load);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession();
  if (response) return response;

  try {
    await prisma.load.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
