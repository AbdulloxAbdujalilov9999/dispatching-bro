import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { RevenueMarginChart } from "@/components/reports/RevenueMarginChart";
import { StatusPieChart } from "@/components/reports/StatusPieChart";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const loads = await prisma.load.findMany({
    select: {
      customerRate: true,
      carrierRate: true,
      createdAt: true,
      status: true,
      carrierId: true,
      customerId: true,
      carrier: { select: { name: true } },
      customer: { select: { name: true } },
    },
  });

  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-US", { month: "short" }) };
  });

  const revenueByMonth = months.map(({ key, label }) => {
    const monthLoads = loads.filter((l) => `${l.createdAt.getFullYear()}-${l.createdAt.getMonth()}` === key);
    const revenue = monthLoads.reduce((sum, l) => sum + Number(l.customerRate), 0);
    const cost = monthLoads.reduce((sum, l) => sum + Number(l.carrierRate), 0);
    return { label, revenue, cost, margin: revenue - cost };
  });

  const statusCounts = Object.entries(
    loads.reduce<Record<string, number>>((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({ status, count }));

  const carrierTotals = new Map<string, number>();
  loads.forEach((l) => {
    if (!l.carrier) return;
    carrierTotals.set(l.carrier.name, (carrierTotals.get(l.carrier.name) || 0) + Number(l.carrierRate));
  });
  const topCarriers = [...carrierTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const customerTotals = new Map<string, number>();
  loads.forEach((l) => {
    if (!l.customer) return;
    customerTotals.set(l.customer.name, (customerTotals.get(l.customer.name) || 0) + Number(l.customerRate));
  });
  const topCustomers = [...customerTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const totalRevenue = loads.reduce((sum, l) => sum + Number(l.customerRate), 0);
  const totalCost = loads.reduce((sum, l) => sum + Number(l.carrierRate), 0);

  return (
    <div>
      <PageHeader title="Reports" description="Revenue, margin, and volume across your operation." />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs. carrier cost, last 6 months</CardTitle>
          </CardHeader>
          <CardBody>
            <RevenueMarginChart data={revenueByMonth} />
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-surface-border pt-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-ink-faint">Total revenue</p>
                <p className="font-semibold text-ink">{formatCurrency(totalRevenue)}</p>
              </div>
              <div>
                <p className="text-ink-faint">Total carrier cost</p>
                <p className="font-semibold text-ink">{formatCurrency(totalCost)}</p>
              </div>
              <div>
                <p className="text-ink-faint">Gross margin</p>
                <p className="font-semibold text-emerald-600">{formatCurrency(totalRevenue - totalCost)}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loads by status</CardTitle>
          </CardHeader>
          <CardBody>
            <StatusPieChart data={statusCounts} />
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top carriers by pay</CardTitle>
          </CardHeader>
          <Table>
            <Thead>
              <Th>Carrier</Th>
              <Th>Total paid</Th>
            </Thead>
            <tbody>
              {topCarriers.length === 0 && (
                <Tr>
                  <Td className="text-ink-faint" colSpan={2}>
                    No data yet
                  </Td>
                </Tr>
              )}
              {topCarriers.map(([name, total]) => (
                <Tr key={name}>
                  <Td label="Carrier">{name}</Td>
                  <Td label="Total paid" className="text-ink-soft">{formatCurrency(total)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top customers by revenue</CardTitle>
          </CardHeader>
          <Table>
            <Thead>
              <Th>Customer</Th>
              <Th>Total billed</Th>
            </Thead>
            <tbody>
              {topCustomers.length === 0 && (
                <Tr>
                  <Td className="text-ink-faint" colSpan={2}>
                    No data yet
                  </Td>
                </Tr>
              )}
              {topCustomers.map(([name, total]) => (
                <Tr key={name}>
                  <Td label="Customer">{name}</Td>
                  <Td label="Total billed" className="text-ink-soft">{formatCurrency(total)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
