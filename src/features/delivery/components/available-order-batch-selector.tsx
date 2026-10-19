"use client";
import { CountNoun } from "@/features/i18n/components/count-noun";
import { DateText } from "@/features/i18n/components/date-text";
import { useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useState } from "react";

import { useRouter } from "next/navigation";

import type { AvailableDeliveryOrdersView } from "@/services/delivery-order.service";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

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
  const t = useText();
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
        setError(t(payload.error?.message ?? "Unable to create the batch."));
        if (response.status === 409) router.refresh();
        return;
      }

      const count = payload.data.orders.length;
      setSuccess(
        t("Batch {id} created with {count} {orders}.", {
          id: payload.data.id,
          count,
          orders: t(count === 1 ? "order" : "orders"),
        }),
      );
      setSelectedIds([]);
      router.refresh();
    } catch {
      setError(t("Unable to create the batch."));
    } finally {
      setPending(false);
    }
  }

  if (orders.length === 0) {
    return (
      <Empty className="mt-6">
        <EmptyHeader>
          <EmptyTitle>
            <Text value={"No ready orders match these filters. "} />
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section className="mt-6" aria-label={t("Available order selection")}>
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
            <Text value={"Suggested nearby groups "} />
          </h2>
          <p className="mt-1 text-sm text-blue-900">
            <Text
              value={
                "Basic straight-line geographic grouping only—not optimized road routes. You make the final selection. "
              }
            />
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
                  <Text value={"Suggested group "} />
                  {index + 1} · {group.direction}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <Text value={t("Stops are within approximately")} />{" "}
                  {group.maximumPairDistanceKm.toFixed(1)}{" "}
                  <Text value={"km of each other. "} />
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {group.orderIds.map((orderId) => (
                    <li key={orderId} className="break-all">
                      {orderById.get(orderId)?.deliveryArea ?? orderId}
                      <span className="sr-only">
                        {" "}
                        <Text value={"· Order "} />
                        {orderId}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => selectSuggestedGroup(group.orderIds)}
                  className="mt-3 text-blue-950"
                >
                  <Text value={"Select suggested group "} />
                  {index + 1}
                </Button>
              </Card>
            ))}
          </div>
        </Card>
      ) : null}
      <Card className="gap-0 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm font-medium">
          {selectedIds.length}{" "}
          <CountNoun
            count={selectedIds.length}
            singular="order"
            plural="orders"
          />{" "}
          <Text value={"selected "} />
        </p>
        <Button
          variant="success"
          type="button"
          disabled={pending || selectedIds.length === 0}
          onClick={createBatch}
        >
          {pending ? t("Creating batch…") : t("Create delivery batch")}
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
                aria-label={t("Select order {id}", { id: order.id })}
                className="mt-1 size-4"
              />
              <span className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-4">
                <span>
                  <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <Text value={"Order ID "} />
                  </span>
                  <span className="mt-1 block break-all font-mono text-sm font-semibold">
                    {order.id}
                  </span>
                  <span className="mt-3 block text-sm font-medium">
                    {order.deliveryArea}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {order.itemCount}{" "}
                    <CountNoun
                      count={order.itemCount}
                      singular="item"
                      plural="items"
                    />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    <Text value={t("Approximate straight-line distance:")} />{" "}
                    {order.distanceKm.toFixed(1)}{" "}
                    <Text value={"km from shop "} />
                  </span>
                  <time className="mt-1 block text-xs text-muted-foreground">
                    <DateText value={order.createdAt} />
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
