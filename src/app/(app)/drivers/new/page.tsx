import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { DriverForm } from "@/components/drivers/DriverForm";

export default async function NewDriverPage() {
  const carriers = await prisma.carrier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New driver" />
      <DriverForm carriers={carriers} />
    </div>
  );
}
