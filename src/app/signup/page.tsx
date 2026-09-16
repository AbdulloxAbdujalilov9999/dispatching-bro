"use client";

import { useState } from "react";
import Link from "next/link";
import { Truck, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup } from "@/components/ui/Field";
import { apiRequest, ApiError } from "@/lib/client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiRequest("/api/auth/register", { method: "POST", json: { name, email, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-card">
            <Truck className="h-5.5 w-5.5" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-ink dark:text-white">Create your account</h1>
          <p className="mt-1 text-center text-sm text-ink-faint">
            An admin will need to approve your account before you can sign in.
          </p>
        </div>

        <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-card dark:border-white/10 dark:bg-slate-900">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-9 w-9 text-emerald-500" />
              <p className="text-sm font-medium text-ink dark:text-white">Account created</p>
              <p className="text-sm text-ink-faint">
                An admin needs to approve your account and set your role before you can log in.
              </p>
              <Link href="/login" className="mt-2 text-sm font-medium text-brand-700 hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <FieldGroup>
                <Label htmlFor="name" required>
                  Full name
                </Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="email" required>
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="password" required>
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </FieldGroup>

              <Button type="submit" className="w-full" loading={loading}>
                Create account
              </Button>

              <p className="mt-4 text-center text-xs text-ink-faint">
                Already have access?{" "}
                <Link href="/login" className="font-medium text-brand-700 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
