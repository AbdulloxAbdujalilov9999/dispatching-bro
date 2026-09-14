import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { settlementSchema } from "@/lib/validation";
import { requireSession, handleApiError, emptyToNull } from "@/lib/api";

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const settlements = await prisma.settlement.findMany({
    orderBy: { createdAt: "desc" },
    include: { load: true, carrier: true },
  });
  return NextResponse.json(settlements);
}

export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  try {
    const body = emptyToNull(await req.json());
    const data = settlementSchema.parse(body);

    const settlement = await prisma.settlement.create({
      data,
      include: { load: true, carrier: true },
    });

    return NextResponse.json(settlement, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
