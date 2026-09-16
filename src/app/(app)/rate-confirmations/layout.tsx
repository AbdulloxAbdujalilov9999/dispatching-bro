import { requireSection } from "@/lib/requireSection";

export default async function RateConfirmationsSectionLayout({ children }: { children: React.ReactNode }) {
  await requireSection("rateConfirmations");
  return children;
}
