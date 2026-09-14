import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Mail, Phone, IdCard, Truck, Compass } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DriverDetailPage(context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const driver = await prisma.driver.findUnique({
    where: { id: params.id },
    include: {
      carrier: true,
      loads: { orderBy: { createdAt: "desc" }, include: { customer: true } },
    },
  });

  if (!driver) notFound();

  return (
    <div>
      <PageHeader
        title={driver.name}
        description="Driver profile"
        actions={
          <>
            <LinkButton href={`/drivers/${driver.id}/edit`} variant="outline">
              <Pencil className="h-4 w-4" /> Edit
            </LinkButton>
            <DeleteButton url={`/api/drivers/${driver.id}`} redirectTo="/drivers" />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Driver details</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div>
              <StatusBadge status={driver.status} />
            </div>
            <div className="flex items-center gap-2 text-ink-soft">
              <Truck className="h-4 w-4 text-ink-faint" />
              {driver.carrier ? (
                <Link href={`/carriers/${driver.carrier.id}`} className="text-brand-700 hover:underline">
                  {driver.carrier.name}
                </Link>
              ) : (
                "Unassigned"
              )}
            </div>
            <div className="flex items-center gap-2 text-ink-soft">
              <Mail className="h-4 w-4 text-ink-faint" /> {driver.email || "—"}
            </div>
            <div className="flex items-center gap-2 text-ink-soft">
              <Phone className="h-4 w-4 text-ink-faint" /> {driver.phone || "—"}
            </div>
            <div className="flex items-center gap-2 text-ink-soft">
              <IdCard className="h-4 w-4 text-ink-faint" />
              {driver.licenseNumber || "No license on file"}
              {driver.licenseExpiry && <>&nbsp;· exp {formatDate(driver.licenseExpiry)}</>}
            </div>
            <p className="text-ink-soft">
              Truck {driver.truckNumber || "—"} · Trailer {driver.trailerNumber || "—"}
            </p>
            {driver.notes && <div className="border-t border-surface-border pt-3 text-ink-soft">{driver.notes}</div>}
          </CardBody>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Loads ({driver.loads.length})</CardTitle>
            </CardHeader>
            {driver.loads.length === 0 ? (
              <EmptyState icon={Compass} title="No loads assigned" />
            ) : (
              <Table>
                <Thead>
                  <Th>Reference</Th>
                  <Th>Route</Th>
                  <Th>Customer</Th>
                  <Th>Status</Th>
                </Thead>
                <tbody>
                  {driver.loads.map((load) => (
                    <Tr key={load.id}>
                      <Td>
                        <Link href={`/loads/${load.id}`} className="font-medium text-brand-700 hover:underline">
                          {load.referenceNumber}
                        </Link>
                      </Td>
                      <Td className="text-ink-soft">
                        {load.pickupLocation} → {load.deliveryLocation}
                      </Td>
                      <Td className="text-ink-soft">{load.customer?.name || "—"}</Td>
                      <Td>
                        <StatusBadge status={load.status} />
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
