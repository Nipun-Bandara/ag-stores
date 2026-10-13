"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { UserStatus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const nextStatus: UserStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const action = nextStatus === "ACTIVE" ? "Activate" : "Deactivate";

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
      setError(payload.error?.message ?? "Unable to update account status.");
    } else {
      setStatus(payload.data.status);
      router.refresh();
    }
    setPending(false);
  }

  return (
    <div>
      <Button
        variant="outline"
        type="button"
        disabled={pending}
        onClick={changeStatus}
      >
        {pending ? "Updating…" : `${action} ${userName}`}
      </Button>
      {error ? (
        <Alert variant="destructive" role="alert" className="mt-2 max-w-sm">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
