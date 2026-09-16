import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userUpdateSchema } from "@/lib/validation";
import { requireSession, handleApiError } from "@/lib/api";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { session, response } = await requireSession(["ADMIN"]);
  if (response) return response;

  try {
    const body = await req.json();
    const data = userUpdateSchema.parse(body);

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const demotingSelf = target.id === session!.user.id;
    const losingAdmin =
      target.role === "ADMIN" &&
      ((data.role !== undefined && data.role !== "ADMIN") || data.active === false);

    if (losingAdmin) {
      const otherActiveAdmins = await prisma.user.count({
        where: { role: "ADMIN", active: true, id: { not: target.id } },
      });
      if (otherActiveAdmins === 0) {
        return NextResponse.json(
          { error: "There must be at least one other active admin before you can change this account." },
          { status: 400 }
        );
      }
    }

    if (demotingSelf && data.active === false) {
      return NextResponse.json({ error: "You can't disable your own account." }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}
