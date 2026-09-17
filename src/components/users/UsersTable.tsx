"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ROLE_LABELS } from "@/lib/permissions";
import { formatDate, initials } from "@/lib/utils";
import { apiRequest, ApiError } from "@/lib/client";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "DISPATCHER" | "ACCOUNTING" | "HR";
  active: boolean;
  createdAt: string;
}

export function UsersTable({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updateUser(id: string, data: { role?: string; active?: boolean }) {
    setBusyId(id);
    try {
      await apiRequest(`/api/users/${id}`, { method: "PATCH", json: data });
      toast.success("Account updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update account");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Table>
      <Thead>
        <Th>Account</Th>
        <Th>Role</Th>
        <Th>Status</Th>
        <Th>Joined</Th>
        <Th>Access</Th>
      </Thead>
      <tbody>
        {users.map((u) => (
          <Tr key={u.id}>
            <Td>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  {initials(u.name)}
                </div>
                <div>
                  <p className="font-medium text-ink">
                    {u.name} {u.id === currentUserId && <span className="text-ink-faint">(you)</span>}
                  </p>
                  <p className="text-xs text-ink-faint">{u.email}</p>
                </div>
              </div>
            </Td>
            <Td label="Role">
              <Select
                value={u.role}
                disabled={busyId === u.id}
                onChange={(e) => updateUser(u.id, { role: e.target.value })}
                className="h-8 w-40 py-1 text-xs"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Td>
            <Td label="Status">
              <Badge color={u.active ? "green" : "amber"}>{u.active ? "Active" : "Pending / Restricted"}</Badge>
            </Td>
            <Td label="Joined" className="text-ink-soft">{formatDate(u.createdAt)}</Td>
            <Td label="Access">
              <Button
                size="sm"
                variant={u.active ? "outline" : "primary"}
                loading={busyId === u.id}
                disabled={u.id === currentUserId && u.active}
                onClick={() => updateUser(u.id, { active: !u.active })}
              >
                {u.active ? "Restrict access" : "Grant access"}
              </Button>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
