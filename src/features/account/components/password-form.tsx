"use client";

import { useState, type FormEvent } from "react";

import { FormError, FormField } from "@/features/auth/components/form-fields";

interface ApiPayload {
  error?: { message?: string };
}

export function PasswordForm() {
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setMessage(undefined);
    setPending(true);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/account/security/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword: form.get("newPassword"),
        confirmPassword: form.get("confirmPassword"),
      }),
    }).catch(() => null);

    if (!response?.ok) {
      const payload = response
        ? ((await response.json().catch(() => ({}))) as ApiPayload)
        : {};
      setError(payload.error?.message ?? "Unable to change your password.");
      setPending(false);
      return;
    }

    formElement.reset();
    setMessage("Password changed successfully.");
    setPending(false);
  }

  return (
    <form className="mt-8 max-w-lg space-y-5" onSubmit={handleSubmit}>
      <FormField
        id="currentPassword"
        name="currentPassword"
        label="Current password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormField
        id="newPassword"
        name="newPassword"
        label="New password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        hint="Use 12+ characters with uppercase, lowercase, number, and symbol."
        required
      />
      <FormField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        required
      />
      {error ? <FormError>{error}</FormError> : null}
      {message ? (
        <p
          role="status"
          className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-md bg-neutral-950 px-5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
