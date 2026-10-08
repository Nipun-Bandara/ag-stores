"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminShopStatusControl({
  shopId,
  shopName,
  initialIsActive,
}: {
  shopId: string;
  shopName: string;
  initialIsActive: boolean;
}) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(initialIsActive);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const action = isActive ? "Deactivate" : "Activate";

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
      setError(payload.error?.message ?? "Unable to update shop status.");
    } else {
      setIsActive(payload.data.isActive);
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
        {pending ? "Updating…" : `${action} ${shopName}`}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
