import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api";

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession(["ADMIN", "MANAGER", "ACCOUNTING"]);
  if (response) return response;

  try {
    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: { status: "SENT" },
    });
    return NextResponse.json(invoice);
  } catch (error) {
    return handleApiError(error);
  }
}
