"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import type {
  DeliveryBatchStatus,
  OrderStatus,
} from "@/generated/prisma/client";

interface BatchActionOrder {
  id: string;
  sequence: number;
  status: OrderStatus;
  deliveryLocation: { label: string; address: string };
}

interface ApiPayload {
  error?: { message?: string };
}

export function DeliveryBatchActions({
  batchId,
  status,
  orders,
}: {
  batchId: string;
  status: DeliveryBatchStatus;
  orders: BatchActionOrder[];
}) {
  const router = useRouter();
  const [sequence, setSequence] = useState(() => orders.map(({ id }) => id));
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const orderById = new Map(orders.map((order) => [order.id, order]));

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= sequence.length) return;
    setSequence((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setMessage("");
  }

  async function request(
    path: string,
    method: "POST" | "PATCH",
    body?: unknown,
  ) {
    setPending(path);
    setError("");
    setMessage("");
    try {
      const response = await fetch(path, {
        method,
        ...(body
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) {
        setError(payload.error?.message ?? "Unable to update this batch.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Unable to update this batch.");
      return false;
    } finally {
      setPending("");
    }
  }

  async function saveSequence() {
    const succeeded = await request(
      `/api/delivery/batches/${batchId}/sequence`,
      "PATCH",
      { orderIds: sequence },
    );
    if (succeeded) setMessage("Delivery sequence saved.");
  }

  async function startBatch() {
    await request(`/api/delivery/batches/${batchId}/start`, "POST");
  }

  async function finishOrder(
    orderId: string,
    nextStatus: "DELIVERED" | "FAILED_DELIVERY",
  ) {
    await request(
      `/api/delivery/batches/${batchId}/orders/${orderId}/status`,
      "PATCH",
      { status: nextStatus },
    );
  }

  return (
    <section className="mt-6 rounded-xl border bg-white p-5">
      <h2 className="text-lg font-semibold">Batch actions</h2>
      {status === "PENDING" ? (
        <>
          <p className="mt-2 text-sm text-neutral-600">
            Arrange every stop before starting. The sequence locks when delivery
            begins.
          </p>
          <ol className="mt-4 space-y-3">
            {sequence.map((orderId, index) => {
              const order = orderById.get(orderId);
              if (!order) return null;
              return (
                <li
                  key={orderId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      Stop {index + 1} · {order.deliveryLocation.label}
                    </p>
                    <p className="truncate text-sm text-neutral-600">
                      {order.deliveryLocation.address}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`Move order ${orderId} up`}
                      disabled={index === 0 || pending !== ""}
                      onClick={() => move(index, -1)}
                      className="rounded border px-3 py-1 text-sm disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move order ${orderId} down`}
                      disabled={index === sequence.length - 1 || pending !== ""}
                      onClick={() => move(index, 1)}
                      className="rounded border px-3 py-1 text-sm disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending !== ""}
              onClick={saveSequence}
              className="rounded-md border border-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {pending.endsWith("/sequence") ? "Saving…" : "Save sequence"}
            </button>
            <button
              type="button"
              disabled={pending !== ""}
              onClick={startBatch}
              className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending.endsWith("/start") ? "Starting…" : "Start delivery"}
            </button>
          </div>
        </>
      ) : null}

      {status === "IN_PROGRESS" ? (
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div>
                <p className="text-sm font-semibold">
                  Stop {order.sequence} · {order.deliveryLocation.label}
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  {order.status.replaceAll("_", " ")}
                </p>
              </div>
              {order.status === "OUT_FOR_DELIVERY" ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending !== ""}
                    onClick={() => finishOrder(order.id, "DELIVERED")}
                    className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Mark delivered
                  </button>
                  <button
                    type="button"
                    disabled={pending !== ""}
                    onClick={() => finishOrder(order.id, "FAILED_DELIVERY")}
                    className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Mark failed
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mt-4 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}
