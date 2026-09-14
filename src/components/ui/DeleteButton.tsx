"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { apiRequest, ApiError } from "@/lib/client";

export function DeleteButton({
  url,
  redirectTo,
  confirmMessage = "This action cannot be undone. Delete this record?",
  label = "Delete",
}: {
  url: string;
  redirectTo: string;
  confirmMessage?: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(confirmMessage)) return;
    setLoading(true);
    try {
      await apiRequest(url, { method: "DELETE" });
      toast.success("Deleted");
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="danger" size="sm" onClick={handleDelete} loading={loading}>
      <Trash2 className="h-4 w-4" /> {label}
    </Button>
  );
}
