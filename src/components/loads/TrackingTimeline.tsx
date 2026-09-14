"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Select } from "@/components/ui/Field";
import { formatDateTime } from "@/lib/utils";
import { apiRequest, ApiError } from "@/lib/client";

interface TrackingUpdate {
  id: string;
  status: string;
  location: string | null;
  note: string | null;
  createdAt: string;
}

export function TrackingTimeline({ loadId, updates }: { loadId: string; updates: TrackingUpdate[] }) {
  const router = useRouter();
  const [status, setStatus] = useState("IN_TRANSIT");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest(`/api/loads/${loadId}/tracking`, {
        method: "POST",
        json: { status, location, note },
      });
      toast.success("Tracking update added");
      setLocation("");
      setNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-5 grid gap-3 sm:grid-cols-4">
        <FieldGroup>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="BOOKED">Booked</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="INVOICED">Invoiced</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </FieldGroup>
        <FieldGroup>
          <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </FieldGroup>
        <FieldGroup className="sm:col-span-1">
          <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </FieldGroup>
        <Button type="submit" loading={loading} className="h-10">
          Add update
        </Button>
      </form>

      <ol className="space-y-4 border-l-2 border-surface-border pl-5">
        {updates.length === 0 && <p className="text-sm text-ink-faint">No tracking updates yet.</p>}
        {updates.map((u) => (
          <li key={u.id} className="relative">
            <span className="absolute -left-[27px] flex h-4 w-4 items-center justify-center rounded-full bg-brand-600">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </span>
            <p className="text-sm font-medium text-ink">
              {u.status.replaceAll("_", " ")} {u.location && <span className="font-normal text-ink-soft">· {u.location}</span>}
            </p>
            {u.note && <p className="text-sm text-ink-soft">{u.note}</p>}
            <p className="text-xs text-ink-faint">{formatDateTime(u.createdAt)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
