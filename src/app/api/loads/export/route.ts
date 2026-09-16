import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import { buildLoadsWorkbook } from "@/lib/excel/loads";

export const runtime = "nodejs";

export async function GET() {
  const { response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER"]);
  if (response) return response;

  const loads = await prisma.load.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true, carrier: true, driver: true },
  });

  const buffer = await buildLoadsWorkbook(loads);
  const filename = `loads-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
