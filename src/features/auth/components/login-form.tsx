"use client";

import { useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";

import { FormError, FormField } from "./form-fields";

interface LoginFormProps {
  returnTo: string;
}

interface ErrorPayload {
  error?: { message?: string };
}

export function LoginForm({ returnTo }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

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
      setError(
        payload.error?.message ?? "Unable to sign in. Please try again.",
      );
      setPending(false);
      return;
    }

    router.replace(returnTo);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FormField
        id="identifier"
        name="identifier"
        label="Email or phone"
        autoComplete="username"
        required
      />
      <FormField
        id="password"
        name="password"
        label="Password"
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
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
