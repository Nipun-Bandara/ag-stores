"use client";
import { useText } from "@/features/i18n/components/locale-provider";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { InputPasswordWithToggle } from "@/components/ui/input-password-with-toggle";
import { Button } from "@/components/ui/button";

interface ApiPayload {
  error?: { message?: string };
}

export function PasswordForm() {
  const t = useText();
  const [pending, setPending] = useState(false);
  const passwordInputProps = {
    showPasswordLabel: t("Show password"),
    hidePasswordLabel: t("Hide password"),
    placeholder: t("Enter your password"),
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      const message = t(
        payload?.error?.message ?? "Unable to change your password.",
      );
      toast.error(message);
      setPending(false);
      return;
    }

    formElement.reset();
    toast.success(t("Password changed successfully."));
    setPending(false);
  }

  return (
    <form className="mt-8 max-w-lg space-y-5" onSubmit={handleSubmit}>
      <InputPasswordWithToggle
        id="currentPassword"
        name="currentPassword"
        label={t("Current password")}
        {...passwordInputProps}
        autoComplete="current-password"
        required
      />
      <InputPasswordWithToggle
        id="newPassword"
        name="newPassword"
        label={t("New password")}
        {...passwordInputProps}
        autoComplete="new-password"
        minLength={8}
        maxLength={128}
        required
      />
      <InputPasswordWithToggle
        id="confirmPassword"
        name="confirmPassword"
        label={t("Confirm new password")}
        {...passwordInputProps}
        autoComplete="new-password"
        minLength={8}
        maxLength={128}
        required
      />
      <Button
        variant="success"
        type="submit"
        disabled={pending}
        className="h-10"
      >
        {pending ? t("Changing…") : t("Change password")}
      </Button>
    </form>
  );
}
