import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canAccess, type Section } from "@/lib/permissions";

/** Server-side layout guard: redirects to the dashboard if the signed-in user's role can't see this section. */
export async function requireSection(section: Section) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!canAccess(session.user.role, section)) redirect("/dashboard");
  return session;
}
