"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
      <Button
        variant="outline"
        type="button"
        disabled={pending}
        onClick={changeStatus}
      >
        {pending ? "Updating…" : `${action} ${shopName}`}
      </Button>
      {error ? (
        <Alert variant="destructive" role="alert" className="mt-2">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
