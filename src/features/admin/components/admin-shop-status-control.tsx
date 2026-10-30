"use client";
import { useText } from "@/features/i18n/components/locale-provider";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { Alert } from "@/components/ui/alert";

export function AdminShopStatusControl({
  shopId,
  shopName,
  initialIsActive,
}: {
  shopId: string;
  shopName: string;
  initialIsActive: boolean;
}) {
  const t = useText();
  const router = useRouter();
  const [isActive, setIsActive] = useState(initialIsActive);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const action = isActive ? t("Deactivate") : t("Activate");

  async function changeStatus() {
    setPending(true);
    setError(undefined);
    const response = await fetch(`/api/admin/shops/${shopId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json().catch(() => ({}))) as {
          data?: { isActive?: boolean };
          error?: { message?: string };
        })
      : {};
    if (!response?.ok || typeof payload.data?.isActive !== "boolean") {
      setError(t(payload.error?.message ?? "Unable to update shop status."));
    } else {
      setIsActive(payload.data.isActive);
      router.refresh();
    }
    setPending(false);
  }

  return (
    <div>
      <IconActionButton
        label={pending ? t("Updating…") : `${action} ${shopName}`}
        variant={isActive ? "destructive" : "success"}
        size="icon-sm"
        type="button"
        disabled={pending}
        onClick={changeStatus}
      >
        {isActive ? (
          <CircleX aria-hidden="true" />
        ) : (
          <CircleCheck aria-hidden="true" />
        )}
      </IconActionButton>
      {error ? (
        <Alert variant="destructive" role="alert" className="mt-2">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
