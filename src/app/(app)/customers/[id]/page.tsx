import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Mail, Phone, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Compass } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      loads: { orderBy: { createdAt: "desc" }, include: { carrier: true } },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) notFound();

  return (
    <div>
      <PageHeader
        title={customer.name}
        description="Customer profile"
        actions={
          <>
            <LinkButton href={`/customers/${customer.id}/edit`} variant="outline">
              <Pencil className="h-4 w-4" /> Edit
            </LinkButton>
            <DeleteButton url={`/api/customers/${customer.id}`} redirectTo="/customers" />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Contact details</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <p className="text-ink-soft">{customer.contactName || "No contact listed"}</p>
            <div className="flex items-center gap-2 text-ink-soft">
              <Mail className="h-4 w-4 text-ink-faint" /> {customer.email || "—"}
            </div>
            <div className="flex items-center gap-2 text-ink-soft">
              <Phone className="h-4 w-4 text-ink-faint" /> {customer.phone || "—"}
            </div>
            <div className="flex items-start gap-2 text-ink-soft">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
              <span>
                {customer.addressLine && <>{customer.addressLine}<br /></>}
                {[customer.city, customer.state, customer.zip].filter(Boolean).join(", ") || "—"}
              </span>
            </div>
            {customer.notes && (
              <div className="border-t border-surface-border pt-3 text-ink-soft">{customer.notes}</div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Loads ({customer.loads.length})</CardTitle>
            </CardHeader>
            {customer.loads.length === 0 ? (
              <EmptyState icon={Compass} title="No loads yet" />
            ) : (
              <Table>
                <Thead>
                  <Th>Reference</Th>
                  <Th>Route</Th>
                  <Th>Carrier</Th>
                  <Th>Status</Th>
                  <Th>Rate</Th>
                </Thead>
                <tbody>
                  {customer.loads.map((load) => (
                    <Tr key={load.id}>
                      <Td>
                        <Link href={`/loads/${load.id}`} className="font-medium text-brand-700 hover:underline">
                          {load.referenceNumber}
                        </Link>
                      </Td>
                      <Td className="text-ink-soft">
                        {load.pickupLocation} → {load.deliveryLocation}
                      </Td>
                      <Td className="text-ink-soft">{load.carrier?.name || "Unassigned"}</Td>
                      <Td>
                        <StatusBadge status={load.status} />
                      </Td>
                      <Td className="text-ink-soft">{formatCurrency(load.customerRate.toString())}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoices ({customer.invoices.length})</CardTitle>
            </CardHeader>
            {customer.invoices.length === 0 ? (
              <EmptyState icon={Compass} title="No invoices yet" />
            ) : (
              <Table>
                <Thead>
                  <Th>Invoice #</Th>
                  <Th>Amount</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                </Thead>
                <tbody>
                  {customer.invoices.map((inv) => (
                    <Tr key={inv.id}>
                      <Td>
                        <Link href={`/invoices/${inv.id}`} className="font-medium text-brand-700 hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </Td>
                      <Td className="text-ink-soft">{formatCurrency(inv.amount.toString())}</Td>
                      <Td className="text-ink-soft">{formatDate(inv.dueDate)}</Td>
                      <Td>
                        <StatusBadge status={inv.status} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
