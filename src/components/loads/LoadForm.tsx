"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FileSignature, UploadCloud } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { FieldGroup, FormRow, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { apiRequest, ApiError } from "@/lib/client";

export interface LoadFormValues {
  status?: string;
  customerId?: string | null;
  carrierId?: string | null;
  driverId?: string | null;
  pickupLocation: string;
  pickupDate: string;
  deliveryLocation: string;
  deliveryDate: string;
  commodity?: string | null;
  weightLbs?: number | null;
  equipment?: string | null;
  customerRate: number;
  carrierRate: number;
  notes?: string | null;
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LoadForm({
  loadId,
  initial,
  customers,
  carriers,
  drivers,
}: {
  loadId?: string;
  initial?: LoadFormValues;
  customers: { id: string; name: string }[];
  carriers: { id: string; name: string }[];
  drivers: { id: string; name: string; carrierId: string | null }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<LoadFormValues>(
    initial
      ? { ...initial, pickupDate: toLocalInput(initial.pickupDate), deliveryDate: toLocalInput(initial.deliveryDate) }
      : {
          status: "BOOKED",
          customerId: "",
          carrierId: "",
          driverId: "",
          pickupLocation: "",
          pickupDate: "",
          deliveryLocation: "",
          deliveryDate: "",
          commodity: "",
          weightLbs: undefined,
          equipment: "",
          customerRate: 0,
          carrierRate: 0,
          notes: "",
        }
  );
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [rcFile, setRcFile] = useState<File | null>(null);
  const [rcFileError, setRcFileError] = useState<string | null>(null);

  function set<K extends keyof LoadFormValues>(key: K, value: LoadFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const availableDrivers = values.carrierId ? drivers.filter((d) => d.carrierId === values.carrierId) : drivers;
  const rcRequired = !loadId && !!values.carrierId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setRcFileError(null);

    if (rcRequired && !rcFile) {
      setRcFileError("Upload the rate confirmation for this carrier before creating the load.");
      return;
    }

    setLoading(true);
    try {
      if (loadId) {
        await apiRequest(`/api/loads/${loadId}`, { method: "PATCH", json: values });
        toast.success("Load updated");
        router.push(`/loads/${loadId}`);
      } else {
        const created = await apiRequest(`/api/loads`, { method: "POST", json: values });

        if (rcFile && values.carrierId) {
          try {
            const formData = new FormData();
            formData.append("loadId", created.id);
            formData.append("carrierId", values.carrierId);
            formData.append("rateAmount", String(values.carrierRate));
            formData.append("file", rcFile);
            await apiRequest(`/api/rate-confirmations/upload`, { method: "POST", body: formData });
          } catch (uploadErr) {
            toast.error(
              uploadErr instanceof ApiError
                ? `Load created, but the RC upload failed: ${uploadErr.message}`
                : "Load created, but the RC upload failed. You can upload it from the load's page."
            );
          }
        }

        toast.success("Load created");
        router.push(`/loads/${created.id}`);
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
          <CardTitle>{loadId ? "Edit load" : "New load"}</CardTitle>
        </CardHeader>
        <CardBody>
          <FormRow className="sm:grid-cols-3">
            <FieldGroup>
              <Label htmlFor="customerId">Customer</Label>
              <Select id="customerId" value={values.customerId || ""} onChange={(e) => set("customerId", e.target.value)}>
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="carrierId">Carrier</Label>
              <Select
                id="carrierId"
                value={values.carrierId || ""}
                onChange={(e) => {
                  set("carrierId", e.target.value);
                  set("driverId", "");
                }}
              >
                <option value="">Unassigned</option>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="driverId">Driver</Label>
              <Select id="driverId" value={values.driverId || ""} onChange={(e) => set("driverId", e.target.value)}>
                <option value="">Unassigned</option>
                {availableDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </FormRow>

          {!loadId && values.carrierId && (
            <FieldGroup>
              <Label htmlFor="rcFile" required>
                Rate confirmation document
              </Label>
              <label
                htmlFor="rcFile"
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-surface-border bg-surface-subtle px-4 py-3 text-sm text-ink-soft hover:border-brand-400 hover:bg-brand-50/40"
              >
                {rcFile ? <FileSignature className="h-5 w-5 text-brand-600" /> : <UploadCloud className="h-5 w-5 text-ink-faint" />}
                <span className="flex-1 truncate">
                  {rcFile ? rcFile.name : "Upload the signed rate confirmation (PDF or image)"}
                </span>
                <span className="shrink-0 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-brand-700 shadow-sm">
                  Choose file
                </span>
              </label>
              <input
                id="rcFile"
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  setRcFile(e.target.files?.[0] || null);
                  setRcFileError(null);
                }}
              />
              {rcFileError && <p className="mt-1 text-xs text-red-600">{rcFileError}</p>}
              <p className="mt-1 text-xs text-ink-faint">
                A carrier is assigned, so the rate confirmation must be attached before this load can be created.
              </p>
            </FieldGroup>
          )}

          {loadId && (
            <FieldGroup>
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={values.status} onChange={(e) => set("status", e.target.value)} className="sm:w-1/3">
                <option value="BOOKED">Booked</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="IN_TRANSIT">In transit</option>
                <option value="DELIVERED">Delivered</option>
                <option value="INVOICED">Invoiced</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </FieldGroup>
          )}

          <FormRow>
            <FieldGroup>
              <Label htmlFor="pickupLocation" required>
                Pickup location
              </Label>
              <Input
                id="pickupLocation"
                placeholder="City, ST"
                value={values.pickupLocation}
                onChange={(e) => set("pickupLocation", e.target.value)}
                required
              />
              {errors.pickupLocation && <p className="mt-1 text-xs text-red-600">{errors.pickupLocation[0]}</p>}
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="pickupDate" required>
                Pickup date/time
              </Label>
              <Input
                id="pickupDate"
                type="datetime-local"
                value={values.pickupDate}
                onChange={(e) => set("pickupDate", e.target.value)}
                required
              />
              {errors.pickupDate && <p className="mt-1 text-xs text-red-600">{errors.pickupDate[0]}</p>}
            </FieldGroup>
          </FormRow>

          <FormRow>
            <FieldGroup>
              <Label htmlFor="deliveryLocation" required>
                Delivery location
              </Label>
              <Input
                id="deliveryLocation"
                placeholder="City, ST"
                value={values.deliveryLocation}
                onChange={(e) => set("deliveryLocation", e.target.value)}
                required
              />
              {errors.deliveryLocation && <p className="mt-1 text-xs text-red-600">{errors.deliveryLocation[0]}</p>}
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="deliveryDate" required>
                Delivery date/time
              </Label>
              <Input
                id="deliveryDate"
                type="datetime-local"
                value={values.deliveryDate}
                onChange={(e) => set("deliveryDate", e.target.value)}
                required
              />
              {errors.deliveryDate && <p className="mt-1 text-xs text-red-600">{errors.deliveryDate[0]}</p>}
            </FieldGroup>
          </FormRow>

          <FormRow className="sm:grid-cols-3">
            <FieldGroup>
              <Label htmlFor="commodity">Commodity</Label>
              <Input id="commodity" value={values.commodity || ""} onChange={(e) => set("commodity", e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="weightLbs">Weight (lbs)</Label>
              <Input
                id="weightLbs"
                type="number"
                value={values.weightLbs ?? ""}
                onChange={(e) => set("weightLbs", e.target.value ? Number(e.target.value) : null)}
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="equipment">Equipment</Label>
              <Select id="equipment" value={values.equipment || ""} onChange={(e) => set("equipment", e.target.value)}>
                <option value="">Select</option>
                <option value="Dry Van">Dry Van</option>
                <option value="Reefer">Reefer</option>
                <option value="Flatbed">Flatbed</option>
                <option value="Step Deck">Step Deck</option>
                <option value="Power Only">Power Only</option>
              </Select>
            </FieldGroup>
          </FormRow>

          <FormRow>
            <FieldGroup>
              <Label htmlFor="customerRate" required>
                Customer rate (what shipper pays)
              </Label>
              <Input
                id="customerRate"
                type="number"
                step="0.01"
                min="0"
                value={values.customerRate}
                onChange={(e) => set("customerRate", Number(e.target.value))}
                required
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="carrierRate" required>
                Carrier rate (what you pay carrier)
              </Label>
              <Input
                id="carrierRate"
                type="number"
                step="0.01"
                min="0"
                value={values.carrierRate}
                onChange={(e) => set("carrierRate", Number(e.target.value))}
                required
              />
            </FieldGroup>
          </FormRow>

          <FieldGroup>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={values.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </FieldGroup>
        </CardBody>
      </Card>

      <div className="mt-4 flex justify-end gap-2">
        <LinkButton href={loadId ? `/loads/${loadId}` : "/loads"} variant="outline">
          Cancel
        </LinkButton>
        <Button type="submit" loading={loading}>
          {loadId ? "Save changes" : "Create load"}
        </Button>
      </div>
    </form>
  );
}
