import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Register | AG Stores" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Customer registration is available here. Staff accounts are created by administrators."
      alternateText="Already registered?"
      alternateHref="/login"
      alternateLabel="Sign in"
    >
      <RegisterForm />
    </AuthShell>
  );
}
