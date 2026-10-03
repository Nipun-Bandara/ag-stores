"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

export function CustomerOrderCancellation({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function cancelOrder() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/account/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error?.message ?? "Unable to cancel this order.");
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to cancel this order.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5"
      aria-label="Cancel order"
    >
      <h2 className="font-semibold text-red-950">Cancel this order</h2>
      <p className="mt-1 text-sm text-red-800">
        Cancellation is available only before the shop confirms the order.
      </p>
      <label className="mt-4 block text-sm font-medium text-red-950">
        Cancellation reason (optional)
        <textarea
          value={reason}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          className="mt-2 min-h-24 w-full rounded-md border border-red-200 bg-white px-3 py-2 text-neutral-950"
        />
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={cancelOrder}
        className="mt-4 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Cancelling…" : "Cancel order"}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </section>
  );
}
