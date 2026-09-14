"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { FieldGroup, Label, Select, Input, Textarea } from "@/components/ui/Field";
import { apiRequest, ApiError } from "@/lib/client";

interface LoadOption {
  id: string;
  referenceNumber: string;
  carrierId: string | null;
  carrierRate: string;
  carrier: { id: string; name: string } | null;
}

export function SettlementForm({ loads }: { loads: LoadOption[] }) {
  const router = useRouter();
  const eligibleLoads = useMemo(() => loads.filter((l) => l.carrierId), [loads]);
  const [loadId, setLoadId] = useState(eligibleLoads[0]?.id || "");
  const selectedLoad = eligibleLoads.find((l) => l.id === loadId);
  const [amount, setAmount] = useState(selectedLoad ? selectedLoad.carrierRate : "0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLoadChange(id: string) {
    setLoadId(id);
    const load = eligibleLoads.find((l) => l.id === id);
    if (load) setAmount(load.carrierRate);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLoad?.carrierId) {
      toast.error("Selected load has no carrier assigned");
      return;
    }
    setLoading(true);
    try {
      await apiRequest(`/api/settlements`, {
        method: "POST",
        json: { loadId, carrierId: selectedLoad.carrierId, amount: Number(amount), notes },
      });
      toast.success("Settlement created");
      router.push(`/invoices`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create settlement");
    } finally {
      setLoading(false);
    }
  }

  if (eligibleLoads.length === 0) {
    return (
      <Card>
        <CardBody className="text-sm text-ink-soft">
          No loads with a carrier assigned yet. Assign a carrier to a load first, then create its settlement (carrier pay).
        </CardBody>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>New carrier settlement</CardTitle>
        </CardHeader>
        <CardBody>
          <FieldGroup>
            <Label htmlFor="loadId" required>
              Load
            </Label>
            <Select id="loadId" value={loadId} onChange={(e) => handleLoadChange(e.target.value)}>
              {eligibleLoads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.referenceNumber} — {l.carrier?.name}
                </option>
              ))}
            </Select>
          </FieldGroup>

          <FieldGroup>
            <Label>Pay to carrier</Label>
            <Input value={selectedLoad?.carrier?.name || ""} disabled />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="amount" required>
              Amount
            </Label>
            <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FieldGroup>
        </CardBody>
      </Card>

      <div className="mt-4 flex justify-end gap-2">
        <LinkButton href="/invoices" variant="outline">
          Cancel
        </LinkButton>
        <Button type="submit" loading={loading}>
          Create settlement
        </Button>
      </div>
    </form>
  );
}
