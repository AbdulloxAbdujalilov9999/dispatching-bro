import { requireSection } from "@/lib/requireSection";

export default async function CarriersSectionLayout({ children }: { children: React.ReactNode }) {
  await requireSection("carriers");
  return children;
}
