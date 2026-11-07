"use client";
import { useText } from "@/features/i18n/components/locale-provider";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { toast } from "sonner";

import type { UserStatus } from "@/generated/prisma/client";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { ConfirmAction } from "@/components/ui/confirm-action";

interface StatusResponse {
  data?: { status?: UserStatus };
  error?: { message?: string };
}

export function UserStatusControl({
  userId,
  userName,
  initialStatus,
}: {
  userId: string;
  userName: string;
  initialStatus: UserStatus;
}) {
  const t = useText();
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const nextStatus: UserStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const action = nextStatus === "ACTIVE" ? t("Activate") : t("Deactivate");

  async function changeStatus() {
    setPending(true);
    const response = await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json().catch(() => ({}))) as StatusResponse)
      : {};

    if (!response?.ok || !payload.data?.status) {
      const message = t(
        payload.error?.message ?? "Unable to update account status.",
      );
      toast.error(message);
    } else {
      setStatus(payload.data.status);
      toast.success(
        t(
          payload.data.status === "ACTIVE"
            ? "{name} was activated."
            : "{name} was deactivated.",
          { name: userName },
        ),
      );
      router.refresh();
    }
    setPending(false);
    return Boolean(response?.ok && payload.data?.status);
  }

  return (
    <ConfirmAction
      title={t(nextStatus === "ACTIVE" ? "Activate user" : "Deactivate user")}
      description={t(
        nextStatus === "ACTIVE"
          ? "Activate {name} to allow them to sign in again?"
          : "Deactivate {name}? They will not be able to sign in until their account is activated again.",
        { name: userName },
      )}
      confirmLabel={action}
      variant={nextStatus === "ACTIVE" ? "success" : "destructive"}
      onConfirm={changeStatus}
    >
      <IconActionButton
        label={pending ? t("Updating…") : `${action} ${userName}`}
        variant={nextStatus === "ACTIVE" ? "success" : "destructive"}
        className="text-white"
        type="button"
        disabled={pending}
      >
        {nextStatus === "ACTIVE" ? (
          <CircleCheck aria-hidden="true" />
        ) : (
          <CircleX aria-hidden="true" className="stroke-white" />
        )}
      </IconActionButton>
    </ConfirmAction>
  );
}
