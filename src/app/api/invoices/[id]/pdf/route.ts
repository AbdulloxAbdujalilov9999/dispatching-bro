import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import { InvoiceDocument } from "@/lib/pdf/documents";
import { renderPdfBuffer } from "@/lib/pdf/render";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession(["ADMIN", "MANAGER", "ACCOUNTING"]);
  if (response) return response;

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { load: true, customer: true },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Invoice PDFs are generated on the fly from the invoice data.
  try {
    const buffer = await renderPdfBuffer(
      InvoiceDocument({
        data: {
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          createdAt: invoice.createdAt,
          dueDate: invoice.dueDate,
          amount: invoice.amount.toString(),
          notes: invoice.notes,
          customer: invoice.customer,
          load: invoice.load,
        },
      })
    );
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Invoice PDF generation failed:", error);
    return NextResponse.json({ error: "Could not generate the PDF." }, { status: 500 });
  }
}
