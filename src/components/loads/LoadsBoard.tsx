"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { MapPin, Calendar, Truck } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest, ApiError } from "@/lib/client";
import { Select } from "@/components/ui/Field";

export interface BoardLoad {
  id: string;
  referenceNumber: string;
  status: string;
  pickupLocation: string;
  pickupDate: string;
  deliveryLocation: string;
  deliveryDate: string;
  customerRate: string;
  carrierRate: string;
  customer: { name: string } | null;
  carrier: { name: string } | null;
  driver: { name: string } | null;
}

const columns: { status: string; label: string }[] = [
  { status: "BOOKED", label: "Booked" },
  { status: "DISPATCHED", label: "Dispatched" },
  { status: "IN_TRANSIT", label: "In Transit" },
  { status: "DELIVERED", label: "Delivered" },
  { status: "INVOICED", label: "Invoiced" },
];

export function LoadsBoard({ loads }: { loads: BoardLoad[] }) {
  const router = useRouter();

  async function changeStatus(loadId: string, status: string) {
    try {
      await apiRequest(`/api/loads/${loadId}`, { method: "PATCH", json: { status } });
      toast.success("Status updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update status");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 overflow-x-auto pb-2 sm:grid-cols-2 xl:grid-cols-5">
      {columns.map((col) => {
        const items = loads.filter((l) => l.status === col.status);
        const total = items.reduce((sum, l) => sum + parseFloat(l.customerRate || "0"), 0);
        return (
          <div key={col.status} className="flex min-w-[260px] flex-col rounded-2xl bg-surface-muted/60 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-ink">{col.label}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-ink-faint shadow-sm">
                {items.length}
              </span>
            </div>
            <div className="flex-1 space-y-3">
              {items.length === 0 && (
                <p className="rounded-xl border border-dashed border-surface-border px-3 py-6 text-center text-xs text-ink-faint">
                  No loads
                </p>
              )}
              {items.map((load) => (
                <div key={load.id} className="rounded-xl border border-surface-border bg-white p-3 shadow-card">
                  <div className="mb-2 flex items-center justify-between">
                    <Link href={`/loads/${load.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
                      {load.referenceNumber}
                    </Link>
                    <span className="text-xs font-medium text-ink-soft">{formatCurrency(load.customerRate)}</span>
                  </div>
                  <p className="mb-1 flex items-center gap-1.5 text-xs text-ink-soft">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                    {load.pickupLocation} → {load.deliveryLocation}
                  </p>
                  <p className="mb-1 flex items-center gap-1.5 text-xs text-ink-soft">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                    {formatDate(load.pickupDate)}
                  </p>
                  <p className="mb-2 flex items-center gap-1.5 text-xs text-ink-soft">
                    <Truck className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                    {load.carrier?.name || "Unassigned carrier"}
                  </p>
                  <Select
                    value={load.status}
                    onChange={(e) => changeStatus(load.id, e.target.value)}
                    className="h-8 py-1 text-xs"
                  >
                    <option value="BOOKED">Booked</option>
                    <option value="DISPATCHED">Dispatched</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="INVOICED">Invoiced</option>
                    <option value="CANCELLED">Cancelled</option>
                  </Select>
                </div>
              ))}
            </div>
            <p className="mt-3 border-t border-surface-border px-1 pt-2 text-xs text-ink-faint">
              {formatCurrency(total)} total
            </p>
          </div>
        );
      })}
    </div>
  );
}
