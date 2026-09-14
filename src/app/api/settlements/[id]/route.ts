import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession();
  if (response) return response;

  try {
    const body = await req.json();
    const status = body.status as "PENDING" | "APPROVED" | "PAID";

    const settlement = await prisma.settlement.update({
      where: { id: params.id },
      data: {
        status,
        paidAt: status === "PAID" ? new Date() : undefined,
      },
    });
    return NextResponse.json(settlement);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession();
  if (response) return response;

  try {
    await prisma.settlement.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
