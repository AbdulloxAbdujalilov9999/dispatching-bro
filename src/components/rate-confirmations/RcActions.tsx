"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Send, FileCheck2, Download } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { apiRequest, ApiError } from "@/lib/client";

export function RcActions({ rcId, status }: { rcId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function act(action: "send" | "sign") {
    setLoading(action);
    try {
      await apiRequest(`/api/rate-confirmations/${rcId}/${action}`, { method: "POST" });
      toast.success(action === "send" ? "Marked as sent" : "Marked as signed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LinkButton href={`/api/rate-confirmations/${rcId}/pdf`} variant="outline" size="sm">
        <Download className="h-4 w-4" /> View / Download PDF
      </LinkButton>
      {status === "DRAFT" && (
        <Button size="sm" onClick={() => act("send")} loading={loading === "send"}>
          <Send className="h-4 w-4" /> Mark as sent
        </Button>
      )}
      {(status === "DRAFT" || status === "SENT") && (
        <Button size="sm" variant="secondary" onClick={() => act("sign")} loading={loading === "sign"}>
          <FileCheck2 className="h-4 w-4" /> Mark as signed
        </Button>
      )}
    </div>
  );
}
