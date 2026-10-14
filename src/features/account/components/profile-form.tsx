"use client";
import { useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";

import {
  FormError,
  FormField,
  SelectField,
} from "@/features/auth/components/form-fields";
import type { AuthenticatedUser } from "@/types/auth";
import { NativeSelectOption } from "@/components/ui/native-select";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ApiPayload {
  error?: { message?: string };
}

export function ProfileForm({ user }: { user: AuthenticatedUser }) {
  const t = useText();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setMessage(undefined);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        preferredLanguage: form.get("preferredLanguage"),
      }),
    }).catch(() => null);

    if (!response?.ok) {
      const payload = response
        ? ((await response.json().catch(() => ({}))) as ApiPayload)
        : {};
      setError(t(payload.error?.message ?? "Unable to update your profile."));
      setPending(false);
      return;
    }

    setMessage(t("Profile updated."));
    setPending(false);
    router.refresh();
  }

  return (
    <form className="mt-8 max-w-lg space-y-5" onSubmit={handleSubmit}>
      <FormField
        id="name"
        name="name"
        label="Name"
        defaultValue={user.name}
        minLength={2}
        maxLength={150}
        autoComplete="name"
        required
      />
      <FormField
        id="email"
        label="Email"
        type="email"
        value={user.email ?? t("Not provided")}
        disabled
        hint="Email changes are not available from this page."
      />
      <FormField
        id="phone"
        name="phone"
        label="Phone"
        type="tel"
        defaultValue={user.phone ?? ""}
        placeholder="+94771234567"
        autoComplete="tel"
      />
      <SelectField
        id="preferredLanguage"
        name="preferredLanguage"
        label="Preferred language"
        defaultValue={user.preferredLanguage}
      >
        <NativeSelectOption value="EN">
          <Text value={t("English")} />
        </NativeSelectOption>
        <NativeSelectOption value="SI">සිංහල</NativeSelectOption>
      </SelectField>
      {error ? <FormError>{error}</FormError> : null}
      {message ? (
        <Alert variant="success" role="status" className="">
          {message}
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending} className="h-10">
        {pending ? t("Saving…") : t("Save profile")}
      </Button>
    </form>
  );
}
