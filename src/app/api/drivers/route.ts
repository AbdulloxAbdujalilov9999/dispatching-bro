import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { driverSchema } from "@/lib/validation";
import { requireSession, handleApiError, emptyToNull } from "@/lib/api";

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const drivers = await prisma.driver.findMany({
    orderBy: { createdAt: "desc" },
    include: { carrier: true, _count: { select: { loads: true } } },
  });
  return NextResponse.json(drivers);
}

export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  try {
    const body = emptyToNull(await req.json());
    const { licenseExpiry, ...rest } = driverSchema.parse(body);
    const driver = await prisma.driver.create({
      data: {
        ...rest,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      },
    });
    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
