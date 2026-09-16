import { requireSection } from "@/lib/requireSection";

export default async function ReportsSectionLayout({ children }: { children: React.ReactNode }) {
  await requireSection("reports");
  return children;
}
