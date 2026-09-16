import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export default async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Re-check the account is still active on every request (not just at login)
  // so an admin disabling an account takes effect immediately, even for
  // someone with an existing session.
  try {
    const user = await prisma.user.findUnique({
      where: { id: token.id },
      select: { active: true },
    });
    if (!user || !user.active) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("disabled", "1");
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete("next-auth.session-token");
      res.cookies.delete("__Secure-next-auth.session-token");
      return res;
    }
  } catch {
    // If the DB is unreachable, fail open on this check rather than locking
    // everyone out — the rest of the app already handles DB errors per page.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/loads/:path*",
    "/carriers/:path*",
    "/drivers/:path*",
    "/customers/:path*",
    "/rate-confirmations/:path*",
    "/invoices/:path*",
    "/settlements/:path*",
    "/reports/:path*",
    "/users/:path*",
    "/settings/:path*",
  ],
};
