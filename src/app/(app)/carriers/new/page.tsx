import { PageHeader } from "@/components/ui/PageHeader";
import { CarrierForm } from "@/components/carriers/CarrierForm";

export default function NewCarrierPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New carrier" />
      <CarrierForm />
    </div>
  );
}
