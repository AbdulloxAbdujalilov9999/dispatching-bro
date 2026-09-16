import { requireSection } from "@/lib/requireSection";

export default async function CustomersSectionLayout({ children }: { children: React.ReactNode }) {
  await requireSection("customers");
  return children;
}
