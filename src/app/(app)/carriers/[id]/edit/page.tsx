import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { CarrierForm } from "@/components/carriers/CarrierForm";

export default async function EditCarrierPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const carrier = await prisma.carrier.findUnique({ where: { id: params.id } });
  if (!carrier) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit carrier" />
      <CarrierForm
        carrierId={carrier.id}
        initial={{
          name: carrier.name,
          mcNumber: carrier.mcNumber,
          dotNumber: carrier.dotNumber,
          contactName: carrier.contactName,
          email: carrier.email,
          phone: carrier.phone,
          insuranceProvider: carrier.insuranceProvider,
          insuranceExpiry: carrier.insuranceExpiry?.toISOString() ?? null,
          status: carrier.status,
          notes: carrier.notes,
        }}
      />
    </div>
  );
}
