import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Mail, Phone, ShieldCheck, UserCircle2, Compass, FileSignature } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CarrierDetailPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const carrier = await prisma.carrier.findUnique({
    where: { id: params.id },
    include: {
      drivers: { orderBy: { createdAt: "desc" } },
      loads: { orderBy: { createdAt: "desc" }, include: { customer: true } },
      rateConfirmations: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!carrier) notFound();

  return (
    <div>
      <PageHeader
        title={carrier.name}
        description="Carrier profile"
        actions={
          <>
            <LinkButton href={`/carriers/${carrier.id}/edit`} variant="outline">
              <Pencil className="h-4 w-4" /> Edit
            </LinkButton>
            <DeleteButton url={`/api/carriers/${carrier.id}`} redirectTo="/carriers" />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Compliance & contact</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div>
              <StatusBadge status={carrier.status} />
            </div>
            <p className="text-ink-soft">
              MC {carrier.mcNumber || "—"} · DOT {carrier.dotNumber || "—"}
            </p>
            <div className="flex items-center gap-2 text-ink-soft">
              <UserCircle2 className="h-4 w-4 text-ink-faint" /> {carrier.contactName || "—"}
            </div>
            <div className="flex items-center gap-2 text-ink-soft">
              <Mail className="h-4 w-4 text-ink-faint" /> {carrier.email || "—"}
            </div>
            <div className="flex items-center gap-2 text-ink-soft">
              <Phone className="h-4 w-4 text-ink-faint" /> {carrier.phone || "—"}
            </div>
            <div className="flex items-center gap-2 text-ink-soft">
              <ShieldCheck className="h-4 w-4 text-ink-faint" />
              {carrier.insuranceProvider || "No insurance on file"}
              {carrier.insuranceExpiry && <>&nbsp;· exp {formatDate(carrier.insuranceExpiry)}</>}
            </div>
            {carrier.notes && <div className="border-t border-surface-border pt-3 text-ink-soft">{carrier.notes}</div>}
          </CardBody>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Drivers ({carrier.drivers.length})</CardTitle>
            </CardHeader>
            {carrier.drivers.length === 0 ? (
              <EmptyState icon={UserCircle2} title="No drivers assigned" />
            ) : (
              <Table>
                <Thead>
                  <Th>Name</Th>
                  <Th>Truck / Trailer</Th>
                  <Th>Status</Th>
                </Thead>
                <tbody>
                  {carrier.drivers.map((d) => (
                    <Tr key={d.id}>
                      <Td label="Name">
                        <Link href={`/drivers/${d.id}`} className="font-medium text-brand-700 hover:underline">
                          {d.name}
                        </Link>
                      </Td>
                      <Td label="Truck / Trailer" className="text-ink-soft">
                        {d.truckNumber || "—"} / {d.trailerNumber || "—"}
                      </Td>
                      <Td label="Status">
                        <StatusBadge status={d.status} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loads ({carrier.loads.length})</CardTitle>
            </CardHeader>
            {carrier.loads.length === 0 ? (
              <EmptyState icon={Compass} title="No loads yet" />
            ) : (
              <Table>
                <Thead>
                  <Th>Reference</Th>
                  <Th>Route</Th>
                  <Th>Customer</Th>
                  <Th>Status</Th>
                  <Th>Carrier rate</Th>
                </Thead>
                <tbody>
                  {carrier.loads.map((load) => (
                    <Tr key={load.id}>
                      <Td label="Reference">
                        <Link href={`/loads/${load.id}`} className="font-medium text-brand-700 hover:underline">
                          {load.referenceNumber}
                        </Link>
                      </Td>
                      <Td label="Route" className="text-ink-soft">
                        {load.pickupLocation} → {load.deliveryLocation}
                      </Td>
                      <Td label="Customer" className="text-ink-soft">{load.customer?.name || "—"}</Td>
                      <Td label="Status">
                        <StatusBadge status={load.status} />
                      </Td>
                      <Td label="Carrier rate" className="text-ink-soft">{formatCurrency(load.carrierRate.toString())}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rate confirmations ({carrier.rateConfirmations.length})</CardTitle>
            </CardHeader>
            {carrier.rateConfirmations.length === 0 ? (
              <EmptyState icon={FileSignature} title="No rate confirmations yet" />
            ) : (
              <Table>
                <Thead>
                  <Th>RC #</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                </Thead>
                <tbody>
                  {carrier.rateConfirmations.map((rc) => (
                    <Tr key={rc.id}>
                      <Td label="RC #">
                        <Link href={`/rate-confirmations/${rc.id}`} className="font-medium text-brand-700 hover:underline">
                          {rc.rcNumber}
                        </Link>
                      </Td>
                      <Td label="Amount" className="text-ink-soft">{formatCurrency(rc.rateAmount.toString())}</Td>
                      <Td label="Status">
                        <StatusBadge status={rc.status} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
