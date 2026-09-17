import Link from "next/link";
import { UserCircle2, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function DriversPage() {
  const drivers = await prisma.driver.findMany({
    orderBy: { createdAt: "desc" },
    include: { carrier: true, _count: { select: { loads: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Drivers"
        description="Drivers available for dispatch."
        actions={
          <LinkButton href="/drivers/new">
            <Plus className="h-4 w-4" /> New driver
          </LinkButton>
        }
      />

      <Card>
        {drivers.length === 0 ? (
          <EmptyState
            icon={UserCircle2}
            title="No drivers yet"
            description="Add a driver to start assigning loads."
            action={
              <LinkButton href="/drivers/new" size="sm">
                <Plus className="h-4 w-4" /> New driver
              </LinkButton>
            }
          />
        ) : (
          <Table>
            <Thead>
              <Th>Driver</Th>
              <Th>Carrier</Th>
              <Th>Truck / Trailer</Th>
              <Th>Loads</Th>
              <Th>Status</Th>
            </Thead>
            <tbody>
              {drivers.map((d) => (
                <Tr key={d.id}>
                  <Td label="Driver">
                    <Link href={`/drivers/${d.id}`} className="font-medium text-brand-700 hover:underline">
                      {d.name}
                    </Link>
                  </Td>
                  <Td label="Carrier" className="text-ink-soft">{d.carrier?.name || "Unassigned"}</Td>
                  <Td label="Truck / Trailer" className="text-ink-soft">
                    {d.truckNumber || "—"} / {d.trailerNumber || "—"}
                  </Td>
                  <Td label="Loads" className="text-ink-soft">{d._count.loads}</Td>
                  <Td label="Status">
                    <StatusBadge status={d.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
