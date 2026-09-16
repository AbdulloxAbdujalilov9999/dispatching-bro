import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { UsersTable } from "@/components/users/UsersTable";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  return (
    <div>
      <PageHeader
        title="Team accounts"
        description="Manage who can access the platform and what they can see. New sign-ups start restricted until you grant them access."
      />
      <Card>
        <UsersTable
          users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
          currentUserId={session!.user.id}
        />
      </Card>
    </div>
  );
}
