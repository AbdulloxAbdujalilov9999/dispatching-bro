import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateConfirmationSchema } from "@/lib/validation";
import { requireSession, handleApiError, emptyToNull } from "@/lib/api";
import { nextSequenceNumber } from "@/lib/utils";
import { RateConfirmationDocument } from "@/lib/pdf/documents";
import { renderPdfBuffer } from "@/lib/pdf/render";
import { uploadDocument } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const rcs = await prisma.rateConfirmation.findMany({
    orderBy: { createdAt: "desc" },
    include: { load: true, carrier: true },
  });
  return NextResponse.json(rcs);
}

export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  try {
    const body = emptyToNull(await req.json());
    const data = rateConfirmationSchema.parse(body);

    const [load, carrier, last] = await Promise.all([
      prisma.load.findUnique({ where: { id: data.loadId } }),
      prisma.carrier.findUnique({ where: { id: data.carrierId } }),
      prisma.rateConfirmation.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

    if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });
    if (!carrier) return NextResponse.json({ error: "Carrier not found" }, { status: 404 });

    const rcNumber = nextSequenceNumber("RC", last?.rcNumber);

    const rc = await prisma.rateConfirmation.create({
      data: {
        rcNumber,
        loadId: data.loadId,
        carrierId: data.carrierId,
        rateAmount: data.rateAmount,
        terms: data.terms || null,
      },
      include: { load: true, carrier: true },
    });

    // Best-effort: generate the PDF and store it. If storage isn't configured
    // yet (Supabase not connected), the RC record still exists and can be
    // regenerated later via the "Generate PDF" action.
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
      const path = `rate-confirmations/${rc.rcNumber}.pdf`;
      await uploadDocument(path, buffer, "application/pdf");
      await prisma.rateConfirmation.update({ where: { id: rc.id }, data: { pdfUrl: path } });
      (rc as any).pdfUrl = path;
    } catch (pdfError) {
      console.error("RC PDF generation/upload skipped:", pdfError);
    }

    return NextResponse.json(rc, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
