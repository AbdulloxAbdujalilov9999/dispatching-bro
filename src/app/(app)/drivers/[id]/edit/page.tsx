import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { DriverForm } from "@/components/drivers/DriverForm";

export default async function EditDriverPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const [driver, carriers] = await Promise.all([
    prisma.driver.findUnique({ where: { id: params.id } }),
    prisma.carrier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!driver) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit driver" />
      <DriverForm
        driverId={driver.id}
        carriers={carriers}
        initial={{
          name: driver.name,
          phone: driver.phone,
          email: driver.email,
          licenseNumber: driver.licenseNumber,
          licenseExpiry: driver.licenseExpiry?.toISOString() ?? null,
          truckNumber: driver.truckNumber,
          trailerNumber: driver.trailerNumber,
          status: driver.status,
          carrierId: driver.carrierId,
          notes: driver.notes,
        }}
      />
    </div>
  );
}
