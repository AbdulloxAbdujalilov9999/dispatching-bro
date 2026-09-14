import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadForm } from "@/components/loads/LoadForm";

export default async function NewLoadPage() {
  const [customers, carriers, drivers] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.carrier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.driver.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, carrierId: true } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New load" />
      <LoadForm customers={customers} carriers={carriers} drivers={drivers} />
    </div>
  );
}
