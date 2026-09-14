import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ loadId?: string }>;
}) {
  const { loadId } = await searchParams;
  const loads = await prisma.load.findMany({
    where: { customerId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      referenceNumber: true,
      customerId: true,
      customerRate: true,
      customer: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New invoice" />
      <InvoiceForm loads={loads.map((l) => ({ ...l, customerRate: l.customerRate.toString() }))} defaultLoadId={loadId} />
    </div>
  );
}
