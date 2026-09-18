import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateConfirmationSchema } from "@/lib/validation";
import { requireSession, handleApiError, emptyToNull } from "@/lib/api";
import { nextSequenceNumber } from "@/lib/sequence";

export const runtime = "nodejs";

export async function GET() {
  const { response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER"]);
  if (response) return response;

  const rcs = await prisma.rateConfirmation.findMany({
    orderBy: { createdAt: "desc" },
    include: { load: true, carrier: true },
  });
  return NextResponse.json(rcs);
}

export async function POST(req: NextRequest) {
  const { response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER"]);
  if (response) return response;

  try {
    const body = emptyToNull(await req.json());
    const data = rateConfirmationSchema.parse(body);

    const [load, carrier] = await Promise.all([
      prisma.load.findUnique({ where: { id: data.loadId } }),
      prisma.carrier.findUnique({ where: { id: data.carrierId } }),
    ]);

    if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });
    if (!carrier) return NextResponse.json({ error: "Carrier not found" }, { status: 404 });

    const rcNumber = await nextSequenceNumber("RC");

    const rc = await prisma.rateConfirmation.create({
      data: {
        rcNumber,
        loadId: data.loadId,
        carrierId: data.carrierId,
        rateAmount: data.rateAmount,
        terms: data.terms || null,
      },
      include: { load: true, carrier: true },
    });

    return NextResponse.json(rc, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
