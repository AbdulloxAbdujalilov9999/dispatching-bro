"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { FieldGroup, FormRow, Input, Label, Textarea } from "@/components/ui/Field";
import { apiRequest, ApiError } from "@/lib/client";

export interface CustomerFormValues {
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  notes?: string | null;
}

export function CustomerForm({ customerId, initial }: { customerId?: string; initial?: CustomerFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<CustomerFormValues>(
    initial || { name: "", contactName: "", email: "", phone: "", addressLine: "", city: "", state: "", zip: "", notes: "" }
  );
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [loading, setLoading] = useState(false);

  function set<K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (customerId) {
        await apiRequest(`/api/customers/${customerId}`, { method: "PATCH", json: values });
        toast.success("Customer updated");
        router.push(`/customers/${customerId}`);
      } else {
        const created = await apiRequest(`/api/customers`, { method: "POST", json: values });
        toast.success("Customer created");
        router.push(`/customers/${created.id}`);
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
          <CardTitle>{customerId ? "Edit customer" : "New customer"}</CardTitle>
        </CardHeader>
        <CardBody>
          <FieldGroup>
            <Label htmlFor="name" required>
              Company name
            </Label>
            <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} required />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name[0]}</p>}
          </FieldGroup>

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
              <Label htmlFor="addressLine">Address</Label>
              <Input id="addressLine" value={values.addressLine || ""} onChange={(e) => set("addressLine", e.target.value)} />
            </FieldGroup>
          </FormRow>

          <FormRow className="sm:grid-cols-3">
            <FieldGroup>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={values.city || ""} onChange={(e) => set("city", e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={values.state || ""} onChange={(e) => set("state", e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" value={values.zip || ""} onChange={(e) => set("zip", e.target.value)} />
            </FieldGroup>
          </FormRow>

          <FieldGroup>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={values.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </FieldGroup>
        </CardBody>
      </Card>

      <div className="mt-4 flex justify-end gap-2">
        <LinkButton href={customerId ? `/customers/${customerId}` : "/customers"} variant="outline">
          Cancel
        </LinkButton>
        <Button type="submit" loading={loading}>
          {customerId ? "Save changes" : "Create customer"}
        </Button>
      </div>
    </form>
  );
}
