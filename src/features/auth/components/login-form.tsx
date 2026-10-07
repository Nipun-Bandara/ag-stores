"use client";

import { useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";

import { getDictionary, routePath, type Locale } from "@/lib/i18n/config";

import { FormError, FormField } from "./form-fields";

interface LoginFormProps {
  returnTo?: string;
  locale: Locale;
  localizedRoute: boolean;
}

interface ErrorPayload {
  error?: { message?: string };
}

interface SuccessPayload {
  data?: { role?: "CUSTOMER" | "SHOP_OWNER" | "DELIVERY_PERSON" | "ADMIN" };
}

const dashboardByRole = {
  CUSTOMER: "/account",
  SHOP_OWNER: "/owner",
  DELIVERY_PERSON: "/delivery",
  ADMIN: "/admin",
} as const;

export function LoginForm({
  returnTo,
  locale,
  localizedRoute,
}: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const copy = getDictionary(locale).auth;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: form.get("identifier"),
        password: form.get("password"),
      }),
    }).catch(() => null);

    if (!response?.ok) {
      const payload = response
        ? ((await response.json().catch(() => ({}))) as ErrorPayload)
        : {};
      setError(payload.error?.message ?? copy.loginError);
      setPending(false);
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as SuccessPayload;
    const dashboard = payload.data?.role
      ? dashboardByRole[payload.data.role]
      : "/account";
    router.replace(returnTo ?? routePath(dashboard, locale, localizedRoute));
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FormField
        id="identifier"
        name="identifier"
        label={copy.emailOrPhone}
        autoComplete="username"
        required
      />
      <FormField
        id="password"
        name="password"
        label={copy.password}
        type="password"
        autoComplete="current-password"
        required
      />
      {error ? <FormError>{error}</FormError> : null}
      <button
        type="submit"
        disabled={pending}
        className="h-10 w-full rounded-md bg-neutral-950 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? copy.signingIn : copy.signIn}
      </button>
    </form>
  );
}
