import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { carrierSchema } from "@/lib/validation";
import { requireSession, handleApiError, emptyToNull } from "@/lib/api";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER", "HR"]);
  if (response) return response;

  const carrier = await prisma.carrier.findUnique({
    where: { id: params.id },
    include: {
      drivers: { orderBy: { createdAt: "desc" } },
      loads: { orderBy: { createdAt: "desc" }, include: { customer: true } },
      rateConfirmations: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!carrier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(carrier);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER", "HR"]);
  if (response) return response;

  try {
    const body = emptyToNull(await req.json());
    const { insuranceExpiry, ...rest } = carrierSchema.partial().parse(body);
    const carrier = await prisma.carrier.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(insuranceExpiry !== undefined
          ? { insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null }
          : {}),
      },
    });
    return NextResponse.json(carrier);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER", "HR"]);
  if (response) return response;

  try {
    await prisma.carrier.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
