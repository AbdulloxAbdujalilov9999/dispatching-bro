import Link from "next/link";
import { FileSignature, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RateConfirmationsPage() {
  const rcs = await prisma.rateConfirmation.findMany({
    orderBy: { createdAt: "desc" },
    include: { load: true, carrier: true },
  });

  return (
    <div>
      <PageHeader
        title="Rate Confirmations"
        description="Signed rate agreements between you and your carriers, per load."
        actions={
          <LinkButton href="/rate-confirmations/new">
            <Plus className="h-4 w-4" /> New rate confirmation
          </LinkButton>
        }
      />

      <Card>
        {rcs.length === 0 ? (
          <EmptyState
            icon={FileSignature}
            title="No rate confirmations yet"
            description="Generate one from a load that has a carrier assigned."
            action={
              <LinkButton href="/rate-confirmations/new" size="sm">
                <Plus className="h-4 w-4" /> New rate confirmation
              </LinkButton>
            }
          />
        ) : (
          <Table>
            <Thead>
              <Th>RC #</Th>
              <Th>Load</Th>
              <Th>Carrier</Th>
              <Th>Amount</Th>
              <Th>Created</Th>
              <Th>Status</Th>
            </Thead>
            <tbody>
              {rcs.map((rc) => (
                <Tr key={rc.id}>
                  <Td>
                    <Link href={`/rate-confirmations/${rc.id}`} className="font-medium text-brand-700 hover:underline">
                      {rc.rcNumber}
                    </Link>
                  </Td>
                  <Td className="text-ink-soft">
                    <Link href={`/loads/${rc.load.id}`} className="hover:underline">
                      {rc.load.referenceNumber}
                    </Link>
                  </Td>
                  <Td className="text-ink-soft">{rc.carrier.name}</Td>
                  <Td className="text-ink-soft">{formatCurrency(rc.rateAmount.toString())}</Td>
                  <Td className="text-ink-soft">{formatDate(rc.createdAt)}</Td>
                  <Td>
                    <StatusBadge status={rc.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
