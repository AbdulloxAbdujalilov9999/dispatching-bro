import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api";
import { nextSequenceNumber } from "@/lib/sequence";
import { uploadDocument } from "@/lib/supabase";

export const runtime = "nodejs";

const MAX_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(req: NextRequest) {
  const { response } = await requireSession(["ADMIN", "MANAGER", "DISPATCHER"]);
  if (response) return response;

  try {
    const formData = await req.formData();
    const loadId = formData.get("loadId");
    const carrierId = formData.get("carrierId");
    const rateAmountRaw = formData.get("rateAmount");
    const file = formData.get("file");

    if (typeof loadId !== "string" || !loadId) {
      return NextResponse.json({ error: "Missing loadId" }, { status: 400 });
    }
    if (typeof carrierId !== "string" || !carrierId) {
      return NextResponse.json({ error: "Missing carrierId" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File is too large (max 15MB)" }, { status: 400 });
    }

    const [load, carrier] = await Promise.all([
      prisma.load.findUnique({ where: { id: loadId } }),
      prisma.carrier.findUnique({ where: { id: carrierId } }),
    ]);
    if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });
    if (!carrier) return NextResponse.json({ error: "Carrier not found" }, { status: 404 });

    const rateAmount = rateAmountRaw ? Number(rateAmountRaw) : Number(load.carrierRate);
    const rcNumber = await nextSequenceNumber("RC");

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "pdf";
    const path = `rate-confirmations/${rcNumber}-uploaded.${ext}`;

    await uploadDocument(path, buffer, file.type || "application/octet-stream");

    const now = new Date();
    const rc = await prisma.rateConfirmation.create({
      data: {
        rcNumber,
        loadId,
        carrierId,
        rateAmount,
        status: "SIGNED",
        pdfUrl: path,
        sentAt: now,
        signedAt: now,
        terms: "Uploaded by dispatcher — already signed/received from carrier.",
      },
      include: { load: true, carrier: true },
    });

    return NextResponse.json(rc, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
