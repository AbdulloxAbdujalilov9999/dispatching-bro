import Link from "next/link";
import { Truck, Plus, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CarriersPage() {
  const carriers = await prisma.carrier.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { loads: true, drivers: true } } },
  });

  const now = new Date();

  return (
    <div>
      <PageHeader
        title="Carriers"
        description="Motor carriers you dispatch freight to."
        actions={
          <LinkButton href="/carriers/new">
            <Plus className="h-4 w-4" /> New carrier
          </LinkButton>
        }
      />

      <Card>
        {carriers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No carriers yet"
            description="Add a carrier to start assigning loads."
            action={
              <LinkButton href="/carriers/new" size="sm">
                <Plus className="h-4 w-4" /> New carrier
              </LinkButton>
            }
          />
        ) : (
          <Table>
            <Thead>
              <Th>Carrier</Th>
              <Th>MC / DOT</Th>
              <Th>Drivers</Th>
              <Th>Loads</Th>
              <Th>Insurance</Th>
              <Th>Status</Th>
            </Thead>
            <tbody>
              {carriers.map((c) => {
                const expiring = c.insuranceExpiry && c.insuranceExpiry < new Date(now.getTime() + 30 * 86400000);
                return (
                  <Tr key={c.id}>
                    <Td>
                      <Link href={`/carriers/${c.id}`} className="font-medium text-brand-700 hover:underline">
                        {c.name}
                      </Link>
                    </Td>
                    <Td className="text-ink-soft">
                      {c.mcNumber || "—"} / {c.dotNumber || "—"}
                    </Td>
                    <Td className="text-ink-soft">{c._count.drivers}</Td>
                    <Td className="text-ink-soft">{c._count.loads}</Td>
                    <Td className="text-ink-soft">
                      <span className="inline-flex items-center gap-1">
                        {expiring && <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />}
                        {formatDate(c.insuranceExpiry)}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge status={c.status} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
