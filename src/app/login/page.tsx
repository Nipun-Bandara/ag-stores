import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in | AG Stores" };

interface LoginPageProps {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const requestedPath = (await searchParams).returnTo;
  const returnTo =
    typeof requestedPath === "string" &&
    requestedPath.startsWith("/") &&
    !requestedPath.startsWith("//")
      ? requestedPath
      : undefined;

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in with your email address or phone number."
      alternateText="New customer?"
      alternateHref="/register"
      alternateLabel="Create an account"
    >
      <LoginForm {...(returnTo ? { returnTo } : {})} />
    </AuthShell>
  );
}
