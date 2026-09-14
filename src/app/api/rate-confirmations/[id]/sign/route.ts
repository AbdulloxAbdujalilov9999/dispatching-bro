import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api";

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession();
  if (response) return response;

  try {
    const rc = await prisma.rateConfirmation.update({
      where: { id: params.id },
      data: { status: "SIGNED", signedAt: new Date() },
    });
    return NextResponse.json(rc);
  } catch (error) {
    return handleApiError(error);
  }
}
