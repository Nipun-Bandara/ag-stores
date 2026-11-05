"use client";
import { useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, CircleCheck, CircleX } from "lucide-react";

import { useRouter } from "next/navigation";

import type {
  DeliveryBatchStatus,
  OrderStatus,
} from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { Card } from "@/components/ui/card";
import { orderStatusLabels } from "@/features/orders/order-presentation";

interface BatchActionOrder {
  id: string;
  sequence: number;
  status: OrderStatus;
  customerFirstName: string;
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
  const t = useText();
  const router = useRouter();
  const [sequence, setSequence] = useState(() => orders.map(({ id }) => id));
  const [pending, setPending] = useState("");

  const orderById = new Map(orders.map((order) => [order.id, order]));

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= sequence.length) return;
    setSequence((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function request(
    path: string,
    method: "POST" | "PATCH",
    successMessage: string,
    body?: unknown,
  ) {
    setPending(path);
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
      const payload = (await response
        .json()
        .catch(() => null)) as ApiPayload | null;
      if (!response.ok) {
        toast.error(
          t(payload?.error?.message ?? "Unable to update this batch."),
        );
        return false;
      }
      toast.success(successMessage);
      router.refresh();
      return true;
    } catch {
      toast.error(t("Unable to update this batch."));
      return false;
    } finally {
      setPending("");
    }
  }

  async function saveSequence() {
    await request(
      `/api/delivery/batches/${batchId}/sequence`,
      "PATCH",
      t("Delivery sequence saved."),
      { orderIds: sequence },
    );
  }

  async function startBatch() {
    await request(
      `/api/delivery/batches/${batchId}/start`,
      "POST",
      t("Delivery started."),
    );
  }

  async function finishOrder(
    orderId: string,
    nextStatus: "DELIVERED" | "FAILED_DELIVERY",
  ) {
    await request(
      `/api/delivery/batches/${batchId}/orders/${orderId}/status`,
      "PATCH",
      t(
        nextStatus === "DELIVERED"
          ? "Order marked as delivered."
          : "Order marked as failed delivery.",
      ),
      { status: nextStatus },
    );
  }

  return (
    <Card
      as="section"
      className="min-w-0 gap-0 border border-border p-4 ring-0 sm:p-5"
    >
      <h2 className="text-lg font-semibold">
        <Text value={t("Batch actions")} />
      </h2>
      {status === "PENDING" ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            <Text
              value={
                "Arrange every stop before starting. The sequence locks when delivery begins. "
              }
            />
          </p>
          <ol className="mt-3 space-y-2">
            {sequence.map((orderId, index) => {
              const order = orderById.get(orderId);
              if (!order) return null;
              return (
                <Card
                  as="li"
                  key={orderId}
                  className="min-w-0 flex-row flex-wrap items-center justify-between gap-3 border border-border p-3 ring-0"
                >
                  <div className="min-w-0 flex-1 basis-32">
                    <p className="break-words text-sm font-semibold">
                      <Text value={"Stop "} />
                      {index + 1} · {order.customerFirstName}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {order.deliveryLocation.address}
                    </p>
                  </div>
                  <div className="ml-auto flex shrink-0 gap-2">
                    <IconActionButton
                      variant="outline"
                      type="button"
                      label={t("Move order {id} up", { id: orderId })}
                      disabled={index === 0 || pending !== ""}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </IconActionButton>
                    <IconActionButton
                      variant="outline"
                      type="button"
                      label={t("Move order {id} down", { id: orderId })}
                      disabled={index === sequence.length - 1 || pending !== ""}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </IconActionButton>
                  </div>
                </Card>
              );
            })}
          </ol>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="outline"
              type="button"
              disabled={pending !== ""}
              onClick={saveSequence}
            >
              {pending.endsWith("/sequence")
                ? t("Saving…")
                : t("Save sequence")}
            </Button>
            <Button
              variant="success"
              type="button"
              disabled={pending !== ""}
              onClick={startBatch}
            >
              {pending.endsWith("/start")
                ? t("Starting…")
                : t("Start delivery")}
            </Button>
          </div>
        </>
      ) : null}

      {status === "IN_PROGRESS" ? (
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="min-w-0 flex-row flex-wrap items-center justify-between gap-3 border border-border p-3 ring-0"
            >
              <div className="min-w-0 flex-1 basis-32">
                <p className="break-words text-sm font-semibold">
                  <Text value={"Stop "} />
                  {order.sequence} · {order.customerFirstName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(orderStatusLabels[order.status])}
                </p>
              </div>
              {order.status === "OUT_FOR_DELIVERY" ? (
                <div className="ml-auto flex flex-wrap gap-2">
                  <IconActionButton
                    variant="success"
                    type="button"
                    label={`${t("Mark delivered")} · ${order.customerFirstName}`}
                    disabled={pending !== ""}
                    onClick={() => finishOrder(order.id, "DELIVERED")}
                  >
                    <CircleCheck aria-hidden="true" />
                  </IconActionButton>
                  <IconActionButton
                    variant="destructive"
                    type="button"
                    label={`${t("Mark failed")} · ${order.customerFirstName}`}
                    disabled={pending !== ""}
                    onClick={() => finishOrder(order.id, "FAILED_DELIVERY")}
                  >
                    <CircleX
                      aria-hidden="true"
                      className="stroke-white [html.dark_&]:stroke-current"
                    />
                  </IconActionButton>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
