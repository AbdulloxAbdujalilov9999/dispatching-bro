import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, MapPin, Calendar, Package, Truck as TruckIcon, Building2, UserCircle2, Plus, FileSignature, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { TrackingTimeline } from "@/components/loads/TrackingTimeline";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LoadDetailPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const load = await prisma.load.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      carrier: true,
      driver: true,
      trackingUpdates: { orderBy: { createdAt: "desc" } },
      rateConfirmations: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      settlements: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!load) notFound();

  const margin = Number(load.customerRate) - Number(load.carrierRate);

  return (
    <div>
      <PageHeader
        title={load.referenceNumber}
        description={`${load.pickupLocation} → ${load.deliveryLocation}`}
        actions={
          <>
            <StatusBadge status={load.status} />
            <LinkButton href={`/loads/${load.id}/edit`} variant="outline">
              <Pencil className="h-4 w-4" /> Edit
            </LinkButton>
            <DeleteButton url={`/api/loads/${load.id}`} redirectTo="/loads" />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Shipment details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-start gap-2 text-ink-soft">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                <div>
                  <p className="font-medium text-ink">{load.pickupLocation}</p>
                  <p>{formatDate(load.pickupDate, "MMM d, yyyy h:mm a")}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-ink-soft">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                <div>
                  <p className="font-medium text-ink">{load.deliveryLocation}</p>
                  <p>{formatDate(load.deliveryDate, "MMM d, yyyy h:mm a")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-ink-soft">
                <Package className="h-4 w-4 text-ink-faint" />
                {load.commodity || "—"} {load.weightLbs ? `· ${load.weightLbs.toLocaleString()} lbs` : ""}
              </div>
              {load.equipment && (
                <div>
                  <Badge color="indigo">{load.equipment}</Badge>
                </div>
              )}
              {load.notes && <div className="border-t border-surface-border pt-3 text-ink-soft">{load.notes}</div>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parties</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-ink-soft">
                <Building2 className="h-4 w-4 text-ink-faint" />
                {load.customer ? (
                  <Link href={`/customers/${load.customer.id}`} className="text-brand-700 hover:underline">
                    {load.customer.name}
                  </Link>
                ) : (
                  "No customer assigned"
                )}
              </div>
              <div className="flex items-center gap-2 text-ink-soft">
                <TruckIcon className="h-4 w-4 text-ink-faint" />
                {load.carrier ? (
                  <Link href={`/carriers/${load.carrier.id}`} className="text-brand-700 hover:underline">
                    {load.carrier.name}
                  </Link>
                ) : (
                  "No carrier assigned"
                )}
              </div>
              <div className="flex items-center gap-2 text-ink-soft">
                <UserCircle2 className="h-4 w-4 text-ink-faint" />
                {load.driver ? (
                  <Link href={`/drivers/${load.driver.id}`} className="text-brand-700 hover:underline">
                    {load.driver.name}
                  </Link>
                ) : (
                  "No driver assigned"
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financials</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Customer rate</span>
                <span className="font-medium text-ink">{formatCurrency(load.customerRate.toString())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Carrier rate</span>
                <span className="font-medium text-ink">{formatCurrency(load.carrierRate.toString())}</span>
              </div>
              <div className="flex justify-between border-t border-surface-border pt-2">
                <span className="text-ink-soft">Margin</span>
                <span className={`font-semibold ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(margin)}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Tracking</CardTitle>
            </CardHeader>
            <CardBody>
              <TrackingTimeline
                loadId={load.id}
                updates={load.trackingUpdates.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rate confirmations</CardTitle>
              {load.carrier && (
                <LinkButton href={`/rate-confirmations/new?loadId=${load.id}`} size="sm" variant="outline">
                  <Plus className="h-3.5 w-3.5" /> New RC
                </LinkButton>
              )}
            </CardHeader>
            <CardBody>
              {load.rateConfirmations.length === 0 ? (
                <p className="text-sm text-ink-faint">
                  {load.carrier
                    ? "No rate confirmation generated yet."
                    : "Assign a carrier to this load before generating a rate confirmation."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {load.rateConfirmations.map((rc) => (
                    <li key={rc.id} className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2">
                      <Link href={`/rate-confirmations/${rc.id}`} className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
                        <FileSignature className="h-4 w-4" /> {rc.rcNumber}
                      </Link>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-ink-soft">{formatCurrency(rc.rateAmount.toString())}</span>
                        <StatusBadge status={rc.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              {load.customer && load.invoices.length === 0 && (
                <LinkButton href={`/invoices/new?loadId=${load.id}`} size="sm" variant="outline">
                  <Plus className="h-3.5 w-3.5" /> New invoice
                </LinkButton>
              )}
            </CardHeader>
            <CardBody>
              {load.invoices.length === 0 ? (
                <p className="text-sm text-ink-faint">
                  {load.customer ? "No invoice generated yet." : "Assign a customer before invoicing this load."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {load.invoices.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2">
                      <Link href={`/invoices/${inv.id}`} className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
                        <Receipt className="h-4 w-4" /> {inv.invoiceNumber}
                      </Link>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-ink-soft">{formatCurrency(inv.amount.toString())}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
