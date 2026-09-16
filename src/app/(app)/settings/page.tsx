import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { ROLE_LABELS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Your account and display preferences." />

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-3 text-sm text-ink-soft">Choose how Haulwise looks on this device.</p>
          <ThemeToggle />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardBody className="space-y-1 text-sm">
          <p className="text-ink-soft">
            Signed in as <span className="font-medium text-ink dark:text-white">{session?.user.name}</span>
          </p>
          <p className="text-ink-soft">{session?.user.email}</p>
          <p className="text-ink-soft">
            Role: <span className="font-medium text-ink dark:text-white">{session && ROLE_LABELS[session.user.role]}</span>
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}
