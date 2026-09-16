import { requireSection } from "@/lib/requireSection";

export default async function SettlementsSectionLayout({ children }: { children: React.ReactNode }) {
  await requireSection("invoices");
  return children;
}
