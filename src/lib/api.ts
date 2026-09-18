import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Role } from "@/lib/db/types";
import { authOptions } from "@/lib/auth";
import { ZodError } from "zod";

export async function requireSession(allowedRoles?: Role[]) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return { session: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, response: null };
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", issues: error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") {
      return NextResponse.json({ error: "A record with this value already exists." }, { status: 409 });
    }
    if (code === "P2025") {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
  }

  console.error(error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export function emptyToNull<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    if (result[key] === "") {
      (result as any)[key] = null;
    }
  }
  return result;
}
