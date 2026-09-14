"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Select } from "@/components/ui/Field";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest, ApiError } from "@/lib/client";

interface Settlement {
  id: string;
  amount: string;
  status: string;
  paidAt: string | null;
  load: { id: string; referenceNumber: string };
  carrier: { id: string; name: string };
}

export function SettlementsTable({ settlements }: { settlements: Settlement[] }) {
  const router = useRouter();

  async function changeStatus(id: string, status: string) {
    try {
      await apiRequest(`/api/settlements/${id}`, { method: "PATCH", json: { status } });
      toast.success("Settlement updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update settlement");
    }
  }

  return (
    <Table>
      <Thead>
        <Th>Load</Th>
        <Th>Carrier</Th>
        <Th>Amount</Th>
        <Th>Paid</Th>
        <Th>Status</Th>
      </Thead>
      <tbody>
        {settlements.map((s) => (
          <Tr key={s.id}>
            <Td>
              <Link href={`/loads/${s.load.id}`} className="font-medium text-brand-700 hover:underline">
                {s.load.referenceNumber}
              </Link>
            </Td>
            <Td className="text-ink-soft">
              <Link href={`/carriers/${s.carrier.id}`} className="hover:underline">
                {s.carrier.name}
              </Link>
            </Td>
            <Td className="text-ink-soft">{formatCurrency(s.amount)}</Td>
            <Td className="text-ink-soft">{s.paidAt ? formatDate(s.paidAt) : "—"}</Td>
            <Td>
              <Select value={s.status} onChange={(e) => changeStatus(s.id, e.target.value)} className="h-8 w-36 py-1 text-xs">
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
              </Select>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
