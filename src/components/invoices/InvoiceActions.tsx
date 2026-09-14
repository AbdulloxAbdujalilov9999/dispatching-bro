"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Send, CheckCircle2, Download } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { apiRequest, ApiError } from "@/lib/client";

export function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function act(action: "send" | "paid") {
    setLoading(action);
    try {
      await apiRequest(`/api/invoices/${invoiceId}/${action}`, { method: "POST" });
      toast.success(action === "send" ? "Marked as sent" : "Marked as paid");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LinkButton href={`/api/invoices/${invoiceId}/pdf`} variant="outline" size="sm">
        <Download className="h-4 w-4" /> View / Download PDF
      </LinkButton>
      {status === "DRAFT" && (
        <Button size="sm" onClick={() => act("send")} loading={loading === "send"}>
          <Send className="h-4 w-4" /> Mark as sent
        </Button>
      )}
      {status !== "PAID" && status !== "VOID" && (
        <Button size="sm" variant="secondary" onClick={() => act("paid")} loading={loading === "paid"}>
          <CheckCircle2 className="h-4 w-4" /> Mark as paid
        </Button>
      )}
    </div>
  );
}
