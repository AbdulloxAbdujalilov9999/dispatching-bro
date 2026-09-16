import { requireSection } from "@/lib/requireSection";

export default async function UsersSectionLayout({ children }: { children: React.ReactNode }) {
  await requireSection("users");
  return children;
}
