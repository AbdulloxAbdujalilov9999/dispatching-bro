import { requireSection } from "@/lib/requireSection";

export default async function DriversSectionLayout({ children }: { children: React.ReactNode }) {
  await requireSection("drivers");
  return children;
}
