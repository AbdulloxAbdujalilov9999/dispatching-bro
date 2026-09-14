import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { carrierSchema } from "@/lib/validation";
import { requireSession, handleApiError, emptyToNull } from "@/lib/api";

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const carriers = await prisma.carrier.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { loads: true, drivers: true } } },
  });
  return NextResponse.json(carriers);
}

export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  try {
    const body = emptyToNull(await req.json());
    const { insuranceExpiry, ...rest } = carrierSchema.parse(body);
    const carrier = await prisma.carrier.create({
      data: {
        ...rest,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
      },
    });
    return NextResponse.json(carrier, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
