import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validation";
import { requireSession, handleApiError, emptyToNull } from "@/lib/api";
import { nextSequenceNumber } from "@/lib/utils";

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { load: true, customer: true },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  try {
    const body = emptyToNull(await req.json());
    const data = invoiceSchema.parse(body);

    const last = await prisma.invoice.findFirst({ orderBy: { createdAt: "desc" } });
    const invoiceNumber = nextSequenceNumber("INV", last?.invoiceNumber);

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
