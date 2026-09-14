import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trackingUpdateSchema } from "@/lib/validation";
import { requireSession, handleApiError, emptyToNull } from "@/lib/api";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession();
  if (response) return response;

  try {
    const body = emptyToNull(await req.json());
    const data = trackingUpdateSchema.parse(body);

    const [update] = await prisma.$transaction([
      prisma.trackingUpdate.create({
        data: { ...data, loadId: params.id },
      }),
      prisma.load.update({ where: { id: params.id }, data: { status: data.status } }),
    ]);

    return NextResponse.json(update, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
