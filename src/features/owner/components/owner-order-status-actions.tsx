"use client";
import { useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useState } from "react";

import { useRouter } from "next/navigation";

import type { OrderStatus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

const actions: Partial<
  Record<OrderStatus, Array<{ status: OrderStatus; label: string }>>
> = {
  PLACED: [
    { status: "CONFIRMED", label: "Confirm order" },
    { status: "REJECTED", label: "Reject order" },
  ],
  CONFIRMED: [{ status: "PREPARING", label: "Mark preparing" }],
  PREPARING: [
    {
      status: "READY_FOR_DELIVERY",
      label: "Mark ready for delivery",
    },
  ],
};

export function OwnerOrderStatusActions({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const t = useText();
  const router = useRouter();
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [error, setError] = useState("");
  const availableActions = actions[status] ?? [];

  if (availableActions.length === 0) return null;

  async function transition(nextStatus: OrderStatus) {
    setPending(nextStatus);
    setError("");
    try {
      const response = await fetch(`/api/owner/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(t(payload.error?.message ?? "Unable to update this order."));
        return;
      }
      router.refresh();
    } catch {
      setError(t("Unable to update this order."));
    } finally {
      setPending(null);
    }
  }

  return (
    <Card
      as="section"
      className="gap-0 mt-6 p-5"
      aria-label={t("Order actions")}
    >
      <h2 className="font-semibold">
        <Text value={t("Update order status")} />
      </h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {availableActions.map((action) => (
          <Button
            key={action.status}
            type="button"
            disabled={pending !== null}
            onClick={() => transition(action.status)}
          >
            {pending === action.status ? t("Updating…") : t(action.label)}
          </Button>
        ))}
      </div>
      {error ? (
        <Alert variant="destructive" role="alert" className="mt-3">
          {error}
        </Alert>
      ) : null}
    </Card>
  );
}
