"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { FieldGroup, FormRow, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { apiRequest, ApiError } from "@/lib/client";

export interface DriverFormValues {
  name: string;
  phone?: string | null;
  email?: string | null;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  truckNumber?: string | null;
  trailerNumber?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  carrierId?: string | null;
  notes?: string | null;
}

export function DriverForm({
  driverId,
  initial,
  carriers,
}: {
  driverId?: string;
  initial?: DriverFormValues;
  carriers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<DriverFormValues>(
    initial || {
      name: "",
      phone: "",
      email: "",
      licenseNumber: "",
      licenseExpiry: "",
      truckNumber: "",
      trailerNumber: "",
      status: "ACTIVE",
      carrierId: "",
      notes: "",
    }
  );
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [loading, setLoading] = useState(false);

  function set<K extends keyof DriverFormValues>(key: K, value: DriverFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (driverId) {
        await apiRequest(`/api/drivers/${driverId}`, { method: "PATCH", json: values });
        toast.success("Driver updated");
        router.push(`/drivers/${driverId}`);
      } else {
        const created = await apiRequest(`/api/drivers`, { method: "POST", json: values });
        toast.success("Driver created");
        router.push(`/drivers/${created.id}`);
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
          <CardTitle>{driverId ? "Edit driver" : "New driver"}</CardTitle>
        </CardHeader>
        <CardBody>
          <FormRow>
            <FieldGroup>
              <Label htmlFor="name" required>
                Driver name
              </Label>
              <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} required />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name[0]}</p>}
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="carrierId">Carrier</Label>
              <Select id="carrierId" value={values.carrierId || ""} onChange={(e) => set("carrierId", e.target.value)}>
                <option value="">Unassigned</option>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </FormRow>

          <FormRow>
            <FieldGroup>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={values.phone || ""} onChange={(e) => set("phone", e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={values.email || ""} onChange={(e) => set("email", e.target.value)} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email[0]}</p>}
            </FieldGroup>
          </FormRow>

          <FormRow>
            <FieldGroup>
              <Label htmlFor="licenseNumber">License number</Label>
              <Input
                id="licenseNumber"
                value={values.licenseNumber || ""}
                onChange={(e) => set("licenseNumber", e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="licenseExpiry">License expiry</Label>
              <Input
                id="licenseExpiry"
                type="date"
                value={values.licenseExpiry ? values.licenseExpiry.slice(0, 10) : ""}
                onChange={(e) => set("licenseExpiry", e.target.value)}
              />
            </FieldGroup>
          </FormRow>

          <FormRow>
            <FieldGroup>
              <Label htmlFor="truckNumber">Truck #</Label>
              <Input id="truckNumber" value={values.truckNumber || ""} onChange={(e) => set("truckNumber", e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="trailerNumber">Trailer #</Label>
              <Input
                id="trailerNumber"
                value={values.trailerNumber || ""}
                onChange={(e) => set("trailerNumber", e.target.value)}
              />
            </FieldGroup>
          </FormRow>

          <FieldGroup>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={values.status}
              onChange={(e) => set("status", e.target.value as any)}
              className="sm:w-1/2"
            >
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On leave</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={values.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </FieldGroup>
        </CardBody>
      </Card>

      <div className="mt-4 flex justify-end gap-2">
        <LinkButton href={driverId ? `/drivers/${driverId}` : "/drivers"} variant="outline">
          Cancel
        </LinkButton>
        <Button type="submit" loading={loading}>
          {driverId ? "Save changes" : "Create driver"}
        </Button>
      </div>
    </form>
  );
}
