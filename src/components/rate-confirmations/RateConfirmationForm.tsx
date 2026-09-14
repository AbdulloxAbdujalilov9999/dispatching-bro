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

export function RateConfirmationForm({ loads, defaultLoadId }: { loads: LoadOption[]; defaultLoadId?: string }) {
  const router = useRouter();
  const eligibleLoads = useMemo(() => loads.filter((l) => l.carrierId), [loads]);
  const [loadId, setLoadId] = useState(defaultLoadId && eligibleLoads.some((l) => l.id === defaultLoadId) ? defaultLoadId : eligibleLoads[0]?.id || "");
  const selectedLoad = eligibleLoads.find((l) => l.id === loadId);
  const [rateAmount, setRateAmount] = useState(selectedLoad ? selectedLoad.carrierRate : "0");
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLoadChange(id: string) {
    setLoadId(id);
    const load = eligibleLoads.find((l) => l.id === id);
    if (load) setRateAmount(load.carrierRate);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLoad?.carrierId) {
      toast.error("Selected load has no carrier assigned");
      return;
    }
    setLoading(true);
    try {
      const rc = await apiRequest(`/api/rate-confirmations`, {
        method: "POST",
        json: { loadId, carrierId: selectedLoad.carrierId, rateAmount: Number(rateAmount), terms },
      });
      toast.success("Rate confirmation created");
      router.push(`/rate-confirmations/${rc.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create rate confirmation");
    } finally {
      setLoading(false);
    }
  }

  if (eligibleLoads.length === 0) {
    return (
      <Card>
        <CardBody className="text-sm text-ink-soft">
          No loads with a carrier assigned yet. Assign a carrier to a load first, then generate its rate confirmation.
        </CardBody>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>New rate confirmation</CardTitle>
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
            <Label>Carrier</Label>
            <Input value={selectedLoad?.carrier?.name || ""} disabled />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="rateAmount" required>
              Rate amount
            </Label>
            <Input
              id="rateAmount"
              type="number"
              step="0.01"
              min="0"
              value={rateAmount}
              onChange={(e) => setRateAmount(e.target.value)}
              required
            />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="terms">Terms (optional — defaults to standard terms)</Label>
            <Textarea id="terms" value={terms} onChange={(e) => setTerms(e.target.value)} />
          </FieldGroup>
        </CardBody>
      </Card>

      <div className="mt-4 flex justify-end gap-2">
        <LinkButton href="/rate-confirmations" variant="outline">
          Cancel
        </LinkButton>
        <Button type="submit" loading={loading}>
          Generate rate confirmation
        </Button>
      </div>
    </form>
  );
}
