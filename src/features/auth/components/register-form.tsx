"use client";

import { useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";

import { getDictionary, routePath, type Locale } from "@/lib/i18n/config";

import { FormError, FormField, SelectField } from "./form-fields";

interface ErrorPayload {
  error?: { message?: string };
}

export function RegisterForm({
  locale,
  localizedRoute,
}: {
  locale: Locale;
  localizedRoute: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const copy = getDictionary(locale).auth;
  const common = getDictionary(locale).common;

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
      setError(payload.error?.message ?? copy.registerError);
      setPending(false);
      return;
    }

    router.replace(routePath("/account", locale, localizedRoute));
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FormField
        id="name"
        name="name"
        label={copy.name}
        autoComplete="name"
        minLength={2}
        maxLength={150}
        required
      />
      <FormField
        id="email"
        name="email"
        label={copy.email}
        type="email"
        autoComplete="email"
        maxLength={320}
      />
      <FormField
        id="phone"
        name="phone"
        label={copy.phone}
        type="tel"
        autoComplete="tel"
        placeholder="+94771234567"
        hint={copy.contactHint}
      />
      <FormField
        id="password"
        name="password"
        label={copy.password}
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        hint={copy.passwordHint}
        required
      />
      <SelectField
        id="preferredLanguage"
        name="preferredLanguage"
        label={copy.preferredLanguage}
        defaultValue={locale === "si" ? "SI" : "EN"}
      >
        <option value="EN">{common.english}</option>
        <option value="SI">{common.sinhala}</option>
      </SelectField>
      {error ? <FormError>{error}</FormError> : null}
      <button
        type="submit"
        disabled={pending}
        className="h-10 w-full rounded-md bg-neutral-950 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? copy.creatingAccount : copy.createCustomerAccount}
      </button>
    </form>
  );
}
