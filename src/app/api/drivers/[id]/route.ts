import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { driverSchema } from "@/lib/validation";
import { requireSession, handleApiError, emptyToNull } from "@/lib/api";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER", "HR"]);
  if (response) return response;

  const driver = await prisma.driver.findUnique({
    where: { id: params.id },
    include: {
      carrier: true,
      loads: { orderBy: { createdAt: "desc" }, include: { customer: true } },
    },
  });
  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(driver);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER", "HR"]);
  if (response) return response;

  try {
    const body = emptyToNull(await req.json());
    const { licenseExpiry, ...rest } = driverSchema.partial().parse(body);
    const driver = await prisma.driver.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(licenseExpiry !== undefined
          ? { licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null }
          : {}),
      },
    });
    return NextResponse.json(driver);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER", "HR"]);
  if (response) return response;

  try {
    await prisma.driver.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
