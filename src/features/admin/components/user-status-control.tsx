"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { UserStatus } from "@/generated/prisma/client";

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
      <button
        type="button"
        disabled={pending}
        onClick={changeStatus}
        className="rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Updating…" : `${action} ${userName}`}
      </button>
      {error ? (
        <p role="alert" className="mt-2 max-w-sm text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
