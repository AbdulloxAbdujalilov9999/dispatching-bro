import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import { downloadDocument, isStoredDocument } from "@/lib/storage";
import { RateConfirmationDocument } from "@/lib/pdf/documents";
import { renderPdfBuffer } from "@/lib/pdf/render";

export const runtime = "nodejs";

function pdfResponse(data: Buffer, filename: string, contentType = "application/pdf") {
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER"]);
  if (response) return response;

  const rc = await prisma.rateConfirmation.findUnique({
    where: { id: params.id },
    include: { load: true, carrier: true },
  });
  if (!rc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // A signed RC that was uploaded by a dispatcher is served from Google Drive.
  if (isStoredDocument(rc.pdfUrl)) {
    try {
      const file = await downloadDocument(rc.pdfUrl);
      if (file) return pdfResponse(file.data, `${rc.rcNumber}`, file.contentType);
    } catch (error) {
      console.error("RC file download failed:", error);
    }
    return NextResponse.json({ error: "Could not fetch the uploaded file from Google Drive." }, { status: 503 });
  }

  // Otherwise the PDF is generated on the fly from the RC data.
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
    return pdfResponse(buffer, `${rc.rcNumber}.pdf`);
  } catch (error) {
    console.error("RC PDF generation failed:", error);
    return NextResponse.json({ error: "Could not generate the PDF." }, { status: 500 });
  }
}
