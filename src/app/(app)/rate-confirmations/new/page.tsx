import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { RateConfirmationForm } from "@/components/rate-confirmations/RateConfirmationForm";

export default async function NewRateConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ loadId?: string }>;
}) {
  const { loadId } = await searchParams;
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
      <PageHeader title="New rate confirmation" />
      <RateConfirmationForm
        loads={loads.map((l) => ({ ...l, carrierRate: l.carrierRate.toString() }))}
        defaultLoadId={loadId}
      />
    </div>
  );
}
