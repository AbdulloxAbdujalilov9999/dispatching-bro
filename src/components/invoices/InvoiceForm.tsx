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
  customerId: string | null;
  customerRate: string;
  customer: { id: string; name: string } | null;
}

export function InvoiceForm({ loads, defaultLoadId }: { loads: LoadOption[]; defaultLoadId?: string }) {
  const router = useRouter();
  const eligibleLoads = useMemo(() => loads.filter((l) => l.customerId), [loads]);
  const [loadId, setLoadId] = useState(
    defaultLoadId && eligibleLoads.some((l) => l.id === defaultLoadId) ? defaultLoadId : eligibleLoads[0]?.id || ""
  );
  const selectedLoad = eligibleLoads.find((l) => l.id === loadId);
  const [amount, setAmount] = useState(selectedLoad ? selectedLoad.customerRate : "0");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLoadChange(id: string) {
    setLoadId(id);
    const load = eligibleLoads.find((l) => l.id === id);
    if (load) setAmount(load.customerRate);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLoad?.customerId) {
      toast.error("Selected load has no customer assigned");
      return;
    }
    setLoading(true);
    try {
      const invoice = await apiRequest(`/api/invoices`, {
        method: "POST",
        json: { loadId, customerId: selectedLoad.customerId, amount: Number(amount), dueDate, notes },
      });
      toast.success("Invoice created");
      router.push(`/invoices/${invoice.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create invoice");
    } finally {
      setLoading(false);
    }
  }

  if (eligibleLoads.length === 0) {
    return (
      <Card>
        <CardBody className="text-sm text-ink-soft">
          No loads with a customer assigned yet. Assign a customer to a load first, then invoice it.
        </CardBody>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>New invoice</CardTitle>
        </CardHeader>
        <CardBody>
          <FieldGroup>
            <Label htmlFor="loadId" required>
              Load
            </Label>
            <Select id="loadId" value={loadId} onChange={(e) => handleLoadChange(e.target.value)}>
              {eligibleLoads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.referenceNumber} — {l.customer?.name}
                </option>
              ))}
            </Select>
          </FieldGroup>

          <FieldGroup>
            <Label>Bill to</Label>
            <Input value={selectedLoad?.customer?.name || ""} disabled />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="amount" required>
              Amount
            </Label>
            <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="dueDate">Due date</Label>
            <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="sm:w-1/2" />
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
          Create invoice
        </Button>
      </div>
    </form>
  );
}
