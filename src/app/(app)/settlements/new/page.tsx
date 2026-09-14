import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettlementForm } from "@/components/invoices/SettlementForm";

export default async function NewSettlementPage() {
  const loads = await prisma.load.findMany({
    where: { carrierId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      referenceNumber: true,
      carrierId: true,
      carrierRate: true,
      carrier: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New carrier settlement" />
      <SettlementForm loads={loads.map((l) => ({ ...l, carrierRate: l.carrierRate.toString() }))} />
    </div>
  );
}
