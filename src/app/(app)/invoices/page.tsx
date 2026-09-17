import Link from "next/link";
import { Receipt, Plus, HandCoins } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SettlementsTable } from "@/components/invoices/SettlementsTable";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const [invoices, settlements] = await Promise.all([
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, include: { load: true, customer: true } }),
    prisma.settlement.findMany({ orderBy: { createdAt: "desc" }, include: { load: true, carrier: true } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Invoices & Settlements"
          description="Bill customers and pay carriers for completed loads."
          actions={
            <>
              <LinkButton href="/settlements/new" variant="outline">
                <HandCoins className="h-4 w-4" /> New settlement
              </LinkButton>
              <LinkButton href="/invoices/new">
                <Plus className="h-4 w-4" /> New invoice
              </LinkButton>
            </>
          }
        />

        <Card>
          {invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              description="Invoice a customer once a load is delivered."
              action={
                <LinkButton href="/invoices/new" size="sm">
                  <Plus className="h-4 w-4" /> New invoice
                </LinkButton>
              }
            />
          ) : (
            <Table>
              <Thead>
                <Th>Invoice #</Th>
                <Th>Load</Th>
                <Th>Customer</Th>
                <Th>Amount</Th>
                <Th>Due</Th>
                <Th>Status</Th>
              </Thead>
              <tbody>
                {invoices.map((inv) => (
                  <Tr key={inv.id}>
                    <Td label="Invoice #">
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-brand-700 hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </Td>
                    <Td label="Load" className="text-ink-soft">
                      <Link href={`/loads/${inv.load.id}`} className="hover:underline">
                        {inv.load.referenceNumber}
                      </Link>
                    </Td>
                    <Td label="Customer" className="text-ink-soft">{inv.customer.name}</Td>
                    <Td label="Amount" className="text-ink-soft">{formatCurrency(inv.amount.toString())}</Td>
                    <Td label="Due" className="text-ink-soft">{formatDate(inv.dueDate)}</Td>
                    <Td label="Status">
                      <StatusBadge status={inv.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Carrier settlements</CardTitle>
          </CardHeader>
          {settlements.length === 0 ? (
            <EmptyState icon={HandCoins} title="No settlements yet" description="Record what you owe carriers per load." />
          ) : (
            <SettlementsTable
              settlements={settlements.map((s) => ({
                id: s.id,
                amount: s.amount.toString(),
                status: s.status,
                paidAt: s.paidAt?.toISOString() ?? null,
                load: { id: s.load.id, referenceNumber: s.load.referenceNumber },
                carrier: { id: s.carrier.id, name: s.carrier.name },
              }))}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
