"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { FieldGroup, FormRow, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { apiRequest, ApiError } from "@/lib/client";

export interface CarrierFormValues {
  name: string;
  mcNumber?: string | null;
  dotNumber?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  insuranceProvider?: string | null;
  insuranceExpiry?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL";
  notes?: string | null;
}

export function CarrierForm({ carrierId, initial }: { carrierId?: string; initial?: CarrierFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<CarrierFormValues>(
    initial || {
      name: "",
      mcNumber: "",
      dotNumber: "",
      contactName: "",
      email: "",
      phone: "",
      insuranceProvider: "",
      insuranceExpiry: "",
      status: "ACTIVE",
      notes: "",
    }
  );
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [loading, setLoading] = useState(false);

  function set<K extends keyof CarrierFormValues>(key: K, value: CarrierFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (carrierId) {
        await apiRequest(`/api/carriers/${carrierId}`, { method: "PATCH", json: values });
        toast.success("Carrier updated");
        router.push(`/carriers/${carrierId}`);
      } else {
        const created = await apiRequest(`/api/carriers`, { method: "POST", json: values });
        toast.success("Carrier created");
        router.push(`/carriers/${created.id}`);
      }
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.issues || {});
        toast.error(err.message);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{carrierId ? "Edit carrier" : "New carrier"}</CardTitle>
        </CardHeader>
        <CardBody>
          <FormRow>
            <FieldGroup>
              <Label htmlFor="name" required>
                Carrier name
              </Label>
              <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} required />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name[0]}</p>}
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={values.status} onChange={(e) => set("status", e.target.value as any)}>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_APPROVAL">Pending approval</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </FieldGroup>
          </FormRow>

          <FormRow>
            <FieldGroup>
              <Label htmlFor="mcNumber">MC number</Label>
              <Input id="mcNumber" value={values.mcNumber || ""} onChange={(e) => set("mcNumber", e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="dotNumber">DOT number</Label>
              <Input id="dotNumber" value={values.dotNumber || ""} onChange={(e) => set("dotNumber", e.target.value)} />
            </FieldGroup>
          </FormRow>

          <FormRow>
            <FieldGroup>
              <Label htmlFor="contactName">Contact name</Label>
              <Input id="contactName" value={values.contactName || ""} onChange={(e) => set("contactName", e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={values.email || ""} onChange={(e) => set("email", e.target.value)} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email[0]}</p>}
            </FieldGroup>
          </FormRow>

          <FormRow>
            <FieldGroup>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={values.phone || ""} onChange={(e) => set("phone", e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="insuranceProvider">Insurance provider</Label>
              <Input
                id="insuranceProvider"
                value={values.insuranceProvider || ""}
                onChange={(e) => set("insuranceProvider", e.target.value)}
              />
            </FieldGroup>
          </FormRow>

          <FieldGroup>
            <Label htmlFor="insuranceExpiry">Insurance expiry</Label>
            <Input
              id="insuranceExpiry"
              type="date"
              value={values.insuranceExpiry ? values.insuranceExpiry.slice(0, 10) : ""}
              onChange={(e) => set("insuranceExpiry", e.target.value)}
              className="sm:w-1/2"
            />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={values.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </FieldGroup>
        </CardBody>
      </Card>

      <div className="mt-4 flex justify-end gap-2">
        <LinkButton href={carrierId ? `/carriers/${carrierId}` : "/carriers"} variant="outline">
          Cancel
        </LinkButton>
        <Button type="submit" loading={loading}>
          {carrierId ? "Save changes" : "Create carrier"}
        </Button>
      </div>
    </form>
  );
}
