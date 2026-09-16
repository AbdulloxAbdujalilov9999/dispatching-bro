import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validation";
import { requireSession, handleApiError, emptyToNull } from "@/lib/api";
import { nextSequenceNumber } from "@/lib/sequence";

export async function GET() {
  const { response } = await requireSession(["ADMIN", "MANAGER", "ACCOUNTING"]);
  if (response) return response;

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { load: true, customer: true },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const { response } = await requireSession(["ADMIN", "MANAGER", "ACCOUNTING"]);
  if (response) return response;

  try {
    const body = emptyToNull(await req.json());
    const data = invoiceSchema.parse(body);

    const invoiceNumber = await nextSequenceNumber("INV");

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        loadId: data.loadId,
        customerId: data.customerId,
        amount: data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
      },
      include: { load: true, customer: true },
    });

    await prisma.load.update({ where: { id: data.loadId }, data: { status: "INVOICED" } }).catch(() => {});

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
