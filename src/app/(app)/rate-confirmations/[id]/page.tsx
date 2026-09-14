import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { RcActions } from "@/components/rate-confirmations/RcActions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RateConfirmationDetailPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const rc = await prisma.rateConfirmation.findUnique({
    where: { id: params.id },
    include: { load: true, carrier: true },
  });

  if (!rc) notFound();

  return (
    <div>
      <PageHeader
        title={rc.rcNumber}
        description="Rate confirmation"
        actions={
          <>
            <StatusBadge status={rc.status} />
            <DeleteButton url={`/api/rate-confirmations/${rc.id}`} redirectTo="/rate-confirmations" />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Agreement</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Load</span>
                <Link href={`/loads/${rc.load.id}`} className="font-medium text-brand-700 hover:underline">
                  {rc.load.referenceNumber}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Carrier</span>
                <Link href={`/carriers/${rc.carrier.id}`} className="font-medium text-brand-700 hover:underline">
                  {rc.carrier.name}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Route</span>
                <span className="font-medium text-ink">
                  {rc.load.pickupLocation} → {rc.load.deliveryLocation}
                </span>
              </div>
              <div className="flex justify-between border-t border-surface-border pt-3">
                <span className="text-ink-soft">Rate amount</span>
                <span className="text-lg font-semibold text-brand-700">{formatCurrency(rc.rateAmount.toString())}</span>
              </div>
              {rc.terms && <p className="border-t border-surface-border pt-3 text-ink-soft">{rc.terms}</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document</CardTitle>
            </CardHeader>
            <CardBody>
              <RcActions rcId={rc.id} status={rc.status} />
            </CardBody>
          </Card>
        </div>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div>
              <p className="text-ink-faint">Created</p>
              <p className="font-medium text-ink">{formatDateTime(rc.createdAt)}</p>
            </div>
            <div>
              <p className="text-ink-faint">Sent</p>
              <p className="font-medium text-ink">{rc.sentAt ? formatDateTime(rc.sentAt) : "Not sent yet"}</p>
            </div>
            <div>
              <p className="text-ink-faint">Signed</p>
              <p className="font-medium text-ink">{rc.signedAt ? formatDateTime(rc.signedAt) : "Not signed yet"}</p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
