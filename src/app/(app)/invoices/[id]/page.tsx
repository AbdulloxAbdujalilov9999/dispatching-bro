import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { InvoiceActions } from "@/components/invoices/InvoiceActions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { load: true, customer: true },
  });

  if (!invoice) notFound();

  return (
    <div>
      <PageHeader
        title={invoice.invoiceNumber}
        description="Invoice"
        actions={
          <>
            <StatusBadge status={invoice.status} />
            <DeleteButton url={`/api/invoices/${invoice.id}`} redirectTo="/invoices" />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Load</span>
                <Link href={`/loads/${invoice.load.id}`} className="font-medium text-brand-700 hover:underline">
                  {invoice.load.referenceNumber}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Bill to</span>
                <Link href={`/customers/${invoice.customer.id}`} className="font-medium text-brand-700 hover:underline">
                  {invoice.customer.name}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Due date</span>
                <span className="font-medium text-ink">{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="flex justify-between border-t border-surface-border pt-3">
                <span className="text-ink-soft">Amount</span>
                <span className="text-lg font-semibold text-brand-700">{formatCurrency(invoice.amount.toString())}</span>
              </div>
              {invoice.notes && <p className="border-t border-surface-border pt-3 text-ink-soft">{invoice.notes}</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document</CardTitle>
            </CardHeader>
            <CardBody>
              <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
            </CardBody>
          </Card>
        </div>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div>
              <p className="text-ink-faint">Issued</p>
              <p className="font-medium text-ink">{formatDateTime(invoice.createdAt)}</p>
            </div>
            <div>
              <p className="text-ink-faint">Paid</p>
              <p className="font-medium text-ink">{invoice.paidAt ? formatDateTime(invoice.paidAt) : "Not paid yet"}</p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
