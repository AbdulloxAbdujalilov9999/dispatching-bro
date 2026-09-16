import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import { getSignedDocumentUrl, uploadDocument } from "@/lib/supabase";
import { RateConfirmationDocument } from "@/lib/pdf/documents";
import { renderPdfBuffer } from "@/lib/pdf/render";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER"]);
  if (response) return response;

  const rc = await prisma.rateConfirmation.findUnique({
    where: { id: params.id },
    include: { load: true, carrier: true },
  });
  if (!rc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const path = rc.pdfUrl || `rate-confirmations/${rc.rcNumber}.pdf`;

  let signedUrl = await getSignedDocumentUrl(path);

  if (!signedUrl) {
    // Not uploaded yet, or storage wasn't reachable before — generate now.
    try {
      const buffer = await renderPdfBuffer(
        RateConfirmationDocument({
          data: {
            rcNumber: rc.rcNumber,
            status: rc.status,
            createdAt: rc.createdAt,
            rateAmount: rc.rateAmount.toString(),
            terms: rc.terms,
            carrier: rc.carrier,
            load: rc.load,
          },
        })
      );
      const result = await uploadDocument(path, buffer, "application/pdf");
      signedUrl = result.signedUrl;
      await prisma.rateConfirmation.update({ where: { id: rc.id }, data: { pdfUrl: path } });
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
