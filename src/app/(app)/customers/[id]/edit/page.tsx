import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomerForm } from "@/components/customers/CustomerForm";

export default async function EditCustomerPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const customer = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit customer" />
      <CustomerForm
        customerId={customer.id}
        initial={{
          name: customer.name,
          contactName: customer.contactName,
          email: customer.email,
          phone: customer.phone,
          addressLine: customer.addressLine,
          city: customer.city,
          state: customer.state,
          zip: customer.zip,
          notes: customer.notes,
        }}
      />
    </div>
  );
}
