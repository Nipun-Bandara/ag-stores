"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { formatOrderDate } from "@/features/orders/order-presentation";
import type { AvailableDeliveryOrdersView } from "@/services/delivery-order.service";

interface BatchApiPayload {
  data?: { id: string; orders: Array<{ orderId: string; sequence: number }> };
  error?: { code?: string; message?: string };
}

export function AvailableOrderBatchSelector({
  orders,
}: {
  orders: AvailableDeliveryOrdersView["orders"];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function toggle(orderId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? [...current, orderId]
        : current.filter((candidate) => candidate !== orderId),
    );
  }

  async function createBatch() {
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/delivery/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: selectedIds }),
      });
      const payload = (await response.json()) as BatchApiPayload;
      if (!response.ok || !payload.data) {
        setError(payload.error?.message ?? "Unable to create the batch.");
        if (response.status === 409) router.refresh();
        return;
      }

      setSuccess(
        `Batch ${payload.data.id} created with ${payload.data.orders.length} order${payload.data.orders.length === 1 ? "" : "s"}.`,
      );
      setSelectedIds([]);
      router.refresh();
    } catch {
      setError("Unable to create the batch.");
    } finally {
      setPending(false);
    }
  }

  if (orders.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed p-10 text-center text-sm text-neutral-600">
        No ready orders match these filters.
      </div>
    );
  }

  return (
    <section className="mt-6" aria-label="Available order selection">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-neutral-50 p-4">
        <p className="text-sm font-medium">
          {selectedIds.length} order{selectedIds.length === 1 ? "" : "s"}{" "}
          selected
        </p>
        <button
          type="button"
          disabled={pending || selectedIds.length === 0}
          onClick={createBatch}
          className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Creating batch…" : "Create delivery batch"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="mt-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4">
        {orders.map((order) => (
          <article
            key={order.id}
            data-testid="available-order-card"
            className="rounded-xl border bg-white p-5 shadow-sm"
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={selectedIds.includes(order.id)}
                onChange={(event) => toggle(order.id, event.target.checked)}
                aria-label={`Select order ${order.id}`}
                className="mt-1 size-4"
              />
              <span className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-4">
                <span>
                  <span className="block text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Order ID
                  </span>
                  <span className="mt-1 block break-all font-mono text-sm font-semibold">
                    {order.id}
                  </span>
                  <span className="mt-3 block text-sm font-medium">
                    {order.deliveryArea}
                  </span>
                  <span className="mt-1 block text-sm text-neutral-600">
                    {order.itemCount} item
                    {order.itemCount === 1 ? "" : "s"}
                  </span>
                  <span className="mt-1 block text-sm text-neutral-600">
                    Approximate straight-line distance:{" "}
                    {order.distanceKm.toFixed(1)} km from shop
                  </span>
                  <time className="mt-1 block text-xs text-neutral-500">
                    {formatOrderDate(order.createdAt)}
                  </time>
                </span>
                <span className="font-semibold">LKR {order.total}</span>
              </span>
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}
