import Link from "next/link";
import { Compass, DollarSign, Receipt, Truck, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [activeLoadsCount, carrierCount, allLoads, outstandingInvoices, recentLoads] = await Promise.all([
    prisma.load.count({ where: { status: { in: ["BOOKED", "DISPATCHED", "IN_TRANSIT"] } } }),
    prisma.carrier.count({ where: { status: "ACTIVE" } }),
    prisma.load.findMany({ select: { customerRate: true, createdAt: true } }),
    prisma.invoice.findMany({ where: { status: { in: ["SENT", "OVERDUE"] } }, select: { amount: true } }),
    prisma.load.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { customer: true, carrier: true },
    }),
  ]);

  const totalRevenue = allLoads.reduce((sum, l) => sum + Number(l.customerRate), 0);
  const outstandingAmount = outstandingInvoices.reduce((sum, i) => sum + Number(i.amount), 0);

  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-US", { month: "short" }) };
  });

  const revenueByMonth = months.map(({ key, label }) => {
    const revenue = allLoads
      .filter((l) => {
        const d = l.createdAt;
        return `${d.getFullYear()}-${d.getMonth()}` === key;
      })
      .reduce((sum, l) => sum + Number(l.customerRate), 0);
    return { label, revenue };
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your dispatch operation."
        actions={
          <LinkButton href="/loads/new">
            <Plus className="h-4 w-4" /> New load
          </LinkButton>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active loads" value={String(activeLoadsCount)} icon={Compass} accent="brand" />
        <StatCard label="Total booked revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} accent="green" />
        <StatCard label="Outstanding invoices" value={formatCurrency(outstandingAmount)} icon={Receipt} accent="amber" />
        <StatCard label="Active carriers" value={String(carrierCount)} icon={Truck} accent="purple" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue, last 6 months</CardTitle>
          </CardHeader>
          <CardBody>
            <RevenueChart data={revenueByMonth} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            <LinkButton href="/loads/new" variant="outline" className="w-full justify-start">
              <Plus className="h-4 w-4" /> Book a new load
            </LinkButton>
            <LinkButton href="/carriers/new" variant="outline" className="w-full justify-start">
              <Plus className="h-4 w-4" /> Add a carrier
            </LinkButton>
            <LinkButton href="/rate-confirmations/new" variant="outline" className="w-full justify-start">
              <Plus className="h-4 w-4" /> Generate a rate confirmation
            </LinkButton>
            <LinkButton href="/invoices/new" variant="outline" className="w-full justify-start">
              <Plus className="h-4 w-4" /> Create an invoice
            </LinkButton>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Recent loads</CardTitle>
          <Link href="/loads" className="text-sm font-medium text-brand-700 hover:underline">
            View all
          </Link>
        </CardHeader>
        {recentLoads.length === 0 ? (
          <EmptyState icon={Compass} title="No loads yet" description="Book your first load to see it here." />
        ) : (
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
              {recentLoads.map((load) => (
                <Tr key={load.id}>
                  <Td label="Reference">
                    <Link href={`/loads/${load.id}`} className="font-medium text-brand-700 hover:underline">
                      {load.referenceNumber}
                    </Link>
                  </Td>
                  <Td label="Route" className="text-ink-soft">
                    {load.pickupLocation} → {load.deliveryLocation}
                  </Td>
                  <Td label="Customer" className="text-ink-soft">{load.customer?.name || "—"}</Td>
                  <Td label="Carrier" className="text-ink-soft">{load.carrier?.name || "Unassigned"}</Td>
                  <Td label="Pickup" className="text-ink-soft">{formatDate(load.pickupDate)}</Td>
                  <Td label="Status">
                    <StatusBadge status={load.status} />
                  </Td>
                  <Td label="Rate" className="text-ink-soft">{formatCurrency(load.customerRate.toString())}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
