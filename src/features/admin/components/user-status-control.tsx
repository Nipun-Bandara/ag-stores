"use client";
import { useText } from "@/features/i18n/components/locale-provider";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";

import type { UserStatus } from "@/generated/prisma/client";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { Alert } from "@/components/ui/alert";

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
  const [error, setError] = useState<string>();
  const nextStatus: UserStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const action = nextStatus === "ACTIVE" ? t("Activate") : t("Deactivate");

  async function changeStatus() {
    setPending(true);
    setError(undefined);
    const response = await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json().catch(() => ({}))) as StatusResponse)
      : {};

    if (!response?.ok || !payload.data?.status) {
      setError(t(payload.error?.message ?? "Unable to update account status."));
    } else {
      setStatus(payload.data.status);
      router.refresh();
    }
    setPending(false);
  }

  return (
    <div>
      <IconActionButton
        label={pending ? t("Updating…") : `${action} ${userName}`}
        variant={nextStatus === "ACTIVE" ? "success" : "destructive"}
        type="button"
        disabled={pending}
        onClick={changeStatus}
      >
        {nextStatus === "ACTIVE" ? (
          <CircleCheck aria-hidden="true" />
        ) : (
          <CircleX aria-hidden="true" />
        )}
      </IconActionButton>
      {error ? (
        <Alert variant="destructive" role="alert" className="mt-2 max-w-sm">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
