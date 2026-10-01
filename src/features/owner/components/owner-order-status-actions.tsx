"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import type { OrderStatus } from "@/generated/prisma/client";

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
        setError(payload.error?.message ?? "Unable to update this order.");
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to update this order.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section
      className="mt-6 rounded-xl border bg-white p-5"
      aria-label="Order actions"
    >
      <h2 className="font-semibold">Update order status</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {availableActions.map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={pending !== null}
            onClick={() => transition(action.status)}
            className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending === action.status ? "Updating…" : action.label}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
