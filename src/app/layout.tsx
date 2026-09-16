import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Haulwise Dispatch",
  description: "Freight dispatch, rate confirmations, invoicing, and tracking in one platform.",
};

const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem("theme") || "system";
    var isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-surface-subtle dark:bg-slate-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
