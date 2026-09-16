import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import { getSignedDocumentUrl, uploadDocument } from "@/lib/supabase";
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

  const path = invoice.pdfUrl || `invoices/${invoice.invoiceNumber}.pdf`;

  let signedUrl = await getSignedDocumentUrl(path);

  if (!signedUrl) {
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
      const result = await uploadDocument(path, buffer, "application/pdf");
      signedUrl = result.signedUrl;
      await prisma.invoice.update({ where: { id: invoice.id }, data: { pdfUrl: path } });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            "Could not generate or fetch the PDF. Make sure Supabase storage is connected (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
        },
        { status: 503 }
      );
    }
  }

  return NextResponse.redirect(signedUrl!);
}
