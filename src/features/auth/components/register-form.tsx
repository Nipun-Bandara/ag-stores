"use client";

import { useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";

import { FormError, FormField, SelectField } from "./form-fields";

interface ErrorPayload {
  error?: { message?: string };
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        password: form.get("password"),
        preferredLanguage: form.get("preferredLanguage"),
      }),
    }).catch(() => null);

    if (!response?.ok) {
      const payload = response
        ? ((await response.json().catch(() => ({}))) as ErrorPayload)
        : {};
      setError(
        payload.error?.message ??
          "Unable to create your account. Please try again.",
      );
      setPending(false);
      return;
    }

    router.replace("/account");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FormField
        id="name"
        name="name"
        label="Name"
        autoComplete="name"
        minLength={2}
        maxLength={150}
        required
      />
      <FormField
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        maxLength={320}
      />
      <FormField
        id="phone"
        name="phone"
        label="Phone"
        type="tel"
        autoComplete="tel"
        placeholder="+94771234567"
        hint="Provide at least an email or an international phone number."
      />
      <FormField
        id="password"
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        hint="Use 12+ characters with uppercase, lowercase, number, and symbol."
        required
      />
      <SelectField
        id="preferredLanguage"
        name="preferredLanguage"
        label="Preferred language"
        defaultValue="EN"
      >
        <option value="EN">English</option>
        <option value="SI">සිංහල</option>
      </SelectField>
      {error ? <FormError>{error}</FormError> : null}
      <button
        type="submit"
        disabled={pending}
        className="h-10 w-full rounded-md bg-neutral-950 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create customer account"}
      </button>
    </form>
  );
}
