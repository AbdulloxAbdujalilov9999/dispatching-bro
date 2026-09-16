import { requireSection } from "@/lib/requireSection";

export default async function InvoicesSectionLayout({ children }: { children: React.ReactNode }) {
  await requireSection("invoices");
  return children;
}
