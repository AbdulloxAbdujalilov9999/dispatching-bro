import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadForm } from "@/components/loads/LoadForm";

export default async function EditLoadPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const [load, customers, carriers, drivers] = await Promise.all([
    prisma.load.findUnique({ where: { id: params.id } }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.carrier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.driver.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, carrierId: true } }),
  ]);

  if (!load) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit load" />
      <LoadForm
        loadId={load.id}
        customers={customers}
        carriers={carriers}
        drivers={drivers}
        initial={{
          status: load.status,
          customerId: load.customerId,
          carrierId: load.carrierId,
          driverId: load.driverId,
          pickupLocation: load.pickupLocation,
          pickupDate: load.pickupDate.toISOString(),
          deliveryLocation: load.deliveryLocation,
          deliveryDate: load.deliveryDate.toISOString(),
          commodity: load.commodity,
          weightLbs: load.weightLbs,
          equipment: load.equipment,
          customerRate: Number(load.customerRate),
          carrierRate: Number(load.carrierRate),
          notes: load.notes,
        }}
      />
    </div>
  );
}
