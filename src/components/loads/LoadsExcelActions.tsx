"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiRequest, ApiError } from "@/lib/client";

interface ImportResult {
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export function LoadsExcelActions() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  function handleImportClick() {
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiRequest<ImportResult>("/api/loads/import", { method: "POST", body: formData });

      if (result.failed > 0) {
        toast.error(
          `Imported ${result.created} new and ${result.updated} updated loads, but ${result.failed} row(s) failed. First issue: row ${result.errors[0]?.row} — ${result.errors[0]?.message}`,
          { duration: 8000 }
        );
      } else {
        toast.success(`Imported: ${result.created} new, ${result.updated} updated.`);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- this is a file download from an API route, not page navigation */}
      <a
        href="/api/loads/export"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-surface-border bg-white px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-subtle dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-white/5"
      >
        <Download className="h-4 w-4" /> Export
      </a>
      <Button type="button" variant="outline" size="md" onClick={handleImportClick} loading={importing}>
        <Upload className="h-4 w-4" /> Import
      </Button>
      <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
    </>
  );
}
