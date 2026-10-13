"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { formatOrderDate } from "@/features/orders/order-presentation";
import type { AvailableDeliveryOrdersView } from "@/services/delivery-order.service";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";

interface BatchApiPayload {
  data?: { id: string; orders: Array<{ orderId: string; sequence: number }> };
  error?: { code?: string; message?: string };
}

export function AvailableOrderBatchSelector({
  orders,
  suggestedGroups,
}: {
  orders: AvailableDeliveryOrdersView["orders"];
  suggestedGroups: AvailableDeliveryOrdersView["suggestedGroups"];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const orderById = new Map(orders.map((order) => [order.id, order]));

  function toggle(orderId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? [...current, orderId]
        : current.filter((candidate) => candidate !== orderId),
    );
  }

  function selectSuggestedGroup(orderIds: readonly string[]) {
    setSelectedIds((current) => [
      ...new Set([
        ...current,
        ...orderIds.filter((orderId) => orderById.has(orderId)),
      ]),
    ]);
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
      <Card className="gap-0 mt-6 border-dashed p-10 text-center text-muted-foreground border ring-0">
        No ready orders match these filters.
      </Card>
    );
  }

  return (
    <section className="mt-6" aria-label="Available order selection">
      {suggestedGroups.length > 0 ? (
        <Card
          as="section"
          className="gap-0 mb-4 bg-blue-50 p-4"
          aria-labelledby="route-suggestions-title"
        >
          <h2
            id="route-suggestions-title"
            className="font-semibold text-blue-950"
          >
            Suggested nearby groups
          </h2>
          <p className="mt-1 text-sm text-blue-900">
            Basic straight-line geographic grouping only—not optimized road
            routes. You make the final selection.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {suggestedGroups.map((group, index) => (
              <Card
                as="article"
                key={group.id}
                data-testid="suggested-delivery-group"
                className="gap-0 p-4"
              >
                <p className="text-sm font-semibold">
                  Suggested group {index + 1} · {group.direction}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Stops are within approximately{" "}
                  {group.maximumPairDistanceKm.toFixed(1)} km of each other.
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {group.orderIds.map((orderId) => (
                    <li key={orderId} className="break-all">
                      {orderById.get(orderId)?.deliveryArea ?? orderId}
                      <span className="sr-only"> · Order {orderId}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => selectSuggestedGroup(group.orderIds)}
                  className="mt-3 text-blue-950"
                >
                  Select suggested group {index + 1}
                </Button>
              </Card>
            ))}
          </div>
        </Card>
      ) : null}
      <Card className="gap-0 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm font-medium">
          {selectedIds.length} order{selectedIds.length === 1 ? "" : "s"}{" "}
          selected
        </p>
        <Button
          type="button"
          disabled={pending || selectedIds.length === 0}
          onClick={createBatch}
        >
          {pending ? "Creating batch…" : "Create delivery batch"}
        </Button>
      </Card>
      {error ? (
        <Alert variant="destructive" role="alert" className="mt-3">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" role="status" className="mt-3">
          {success}
        </Alert>
      ) : null}

      <div className="mt-4 grid gap-4">
        {orders.map((order) => (
          <Card
            as="article"
            key={order.id}
            data-testid="available-order-card"
            className="gap-0 p-5"
          >
            <Label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={selectedIds.includes(order.id)}
                onCheckedChange={(checked) => toggle(order.id, checked)}
                aria-label={`Select order ${order.id}`}
                className="mt-1 size-4"
              />
              <span className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-4">
                <span>
                  <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Order ID
                  </span>
                  <span className="mt-1 block break-all font-mono text-sm font-semibold">
                    {order.id}
                  </span>
                  <span className="mt-3 block text-sm font-medium">
                    {order.deliveryArea}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {order.itemCount} item
                    {order.itemCount === 1 ? "" : "s"}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Approximate straight-line distance:{" "}
                    {order.distanceKm.toFixed(1)} km from shop
                  </span>
                  <time className="mt-1 block text-xs text-muted-foreground">
                    {formatOrderDate(order.createdAt)}
                  </time>
                </span>
                <span className="font-semibold">LKR {order.total}</span>
              </span>
            </Label>
          </Card>
        ))}
      </div>
    </section>
  );
}
