import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { loads: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Shippers you book freight for."
        actions={
          <LinkButton href="/customers/new">
            <Plus className="h-4 w-4" /> New customer
          </LinkButton>
        }
      />

      <Card>
        {customers.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No customers yet"
            description="Add your first customer to start booking loads."
            action={
              <LinkButton href="/customers/new" size="sm">
                <Plus className="h-4 w-4" /> New customer
              </LinkButton>
            }
          />
        ) : (
          <Table>
            <Thead>
              <Th>Company</Th>
              <Th>Contact</Th>
              <Th>Location</Th>
              <Th>Loads</Th>
            </Thead>
            <tbody>
              {customers.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <Link href={`/customers/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {c.name}
                    </Link>
                  </Td>
                  <Td className="text-ink-soft">{c.contactName || "—"}</Td>
                  <Td className="text-ink-soft">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</Td>
                  <Td className="text-ink-soft">{c._count.loads}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
