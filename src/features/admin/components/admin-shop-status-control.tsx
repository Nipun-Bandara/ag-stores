"use client";
import { useText } from "@/features/i18n/components/locale-provider";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { toast } from "sonner";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { ConfirmAction } from "@/components/ui/confirm-action";

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
  const action = isActive ? t("Deactivate") : t("Activate");

  async function changeStatus() {
    setPending(true);
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
      const message = t(
        payload.error?.message ?? "Unable to update shop status.",
      );
      toast.error(message);
    } else {
      setIsActive(payload.data.isActive);
      toast.success(
        t(
          payload.data.isActive
            ? "{name} was activated."
            : "{name} was deactivated.",
          { name: shopName },
        ),
      );
      router.refresh();
    }
    setPending(false);
    return Boolean(response?.ok && typeof payload.data?.isActive === "boolean");
  }

  return (
    <ConfirmAction
      title={t(isActive ? "Deactivate shop" : "Activate shop")}
      description={t(
        isActive
          ? "Deactivate {name}? Customers will no longer be able to order from this shop."
          : "Activate {name} to make the shop available again?",
        { name: shopName },
      )}
      confirmLabel={action}
      variant={isActive ? "destructive" : "success"}
      onConfirm={changeStatus}
    >
      <IconActionButton
        label={pending ? t("Updating…") : `${action} ${shopName}`}
        variant={isActive ? "destructive" : "success"}
        className="text-white"
        size="icon-sm"
        type="button"
        disabled={pending}
      >
        {isActive ? (
          <CircleX aria-hidden="true" className="stroke-white" />
        ) : (
          <CircleCheck aria-hidden="true" className="stroke-white" />
        )}
      </IconActionButton>
    </ConfirmAction>
  );
}
