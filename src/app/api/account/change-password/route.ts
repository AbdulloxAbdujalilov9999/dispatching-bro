import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validation";
import { requireSession, handleApiError } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  try {
    const body = await req.json();
    const data = changePasswordSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: session!.user.id } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
