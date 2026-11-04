import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/features/account/components/profile-form";
import { PasswordForm } from "@/features/account/components/password-form";
import { Text } from "@/features/i18n/components/text";
import { ROLE_LABELS } from "@/lib/navigation";
import type { AuthenticatedUser } from "@/types/auth";

export function WorkspaceProfile({ user }: { user: AuthenticatedUser }) {
  return (
    <div className="min-w-0 w-full max-w-3xl space-y-6">
      <Card as="section" className="min-w-0 gap-0 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">
          <Text value="My profile" />
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <Text value="Update your name, mobile number, optional email and language." />
        </p>
        <p className="mt-4 text-sm">
          <Text value="Role" />: <Text value={ROLE_LABELS[user.role]} />
        </p>
        <ProfileForm user={user} />
      </Card>
      <Card as="section" id="password" className="min-w-0 gap-0 p-4 sm:p-6">
        <h2 className="text-xl font-semibold">
          <Text value="Change password" />
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          <Text value="Changing your password requires your current password and signs out other sessions." />
        </p>
        <PasswordForm />
      </Card>
    </div>
  );
}
