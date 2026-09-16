import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { LoadsBoard } from "@/components/loads/LoadsBoard";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LoadsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: viewParam } = await searchParams;
  const view = viewParam === "list" ? "list" : "board";

  const loads = await prisma.load.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true, carrier: true, driver: true },
  });

  const serialized = loads.map((l) => ({
    id: l.id,
    referenceNumber: l.referenceNumber,
    status: l.status,
    pickupLocation: l.pickupLocation,
    pickupDate: l.pickupDate.toISOString(),
    deliveryLocation: l.deliveryLocation,
    deliveryDate: l.deliveryDate.toISOString(),
    customerRate: l.customerRate.toString(),
    carrierRate: l.carrierRate.toString(),
    customer: l.customer ? { name: l.customer.name } : null,
    carrier: l.carrier ? { name: l.carrier.name } : null,
    driver: l.driver ? { name: l.driver.name } : null,
  }));

  return (
    <div>
      <PageHeader
        title="Loads"
        description="Your dispatch board — track every load from booking to invoice."
        actions={
          <LinkButton href="/loads/new">
            <Plus className="h-4 w-4" /> New load
          </LinkButton>
        }
      />

      <div className="mb-4 inline-flex rounded-lg border border-surface-border bg-white p-1 dark:border-white/10 dark:bg-slate-900">
        <Link
          href="/loads?view=board"
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            view === "board" ? "bg-brand-600 text-white" : "text-ink-soft hover:bg-surface-subtle dark:text-slate-300 dark:hover:bg-white/5"
          )}
        >
          Board
        </Link>
        <Link
          href="/loads?view=list"
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            view === "list" ? "bg-brand-600 text-white" : "text-ink-soft hover:bg-surface-subtle dark:text-slate-300 dark:hover:bg-white/5"
          )}
        >
          List
        </Link>
      </div>

      {view === "board" ? (
        <LoadsBoard loads={serialized} />
      ) : (
        <Card>
          <Table>
            <Thead>
              <Th>Reference</Th>
              <Th>Route</Th>
              <Th>Customer</Th>
              <Th>Carrier</Th>
              <Th>Pickup</Th>
              <Th>Status</Th>
              <Th>Rate</Th>
            </Thead>
            <tbody>
              {loads.map((load) => (
                <Tr key={load.id}>
                  <Td>
                    <Link href={`/loads/${load.id}`} className="font-medium text-brand-700 hover:underline">
                      {load.referenceNumber}
                    </Link>
                  </Td>
                  <Td className="text-ink-soft">
                    {load.pickupLocation} → {load.deliveryLocation}
                  </Td>
                  <Td className="text-ink-soft">{load.customer?.name || "—"}</Td>
                  <Td className="text-ink-soft">{load.carrier?.name || "Unassigned"}</Td>
                  <Td className="text-ink-soft">{formatDate(load.pickupDate)}</Td>
                  <Td>
                    <StatusBadge status={load.status} />
                  </Td>
                  <Td className="text-ink-soft">{formatCurrency(load.customerRate.toString())}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
