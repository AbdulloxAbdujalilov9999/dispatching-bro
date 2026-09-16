import { requireSection } from "@/lib/requireSection";

export default async function LoadsSectionLayout({ children }: { children: React.ReactNode }) {
  await requireSection("loads");
  return children;
}
