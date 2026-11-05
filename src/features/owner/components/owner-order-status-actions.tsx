"use client";
import { useText } from "@/features/i18n/components/locale-provider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import type { OrderStatus } from "@/generated/prisma/client";
import {
  getAllowedOrderTransitions,
  ORDER_TRANSITION_ROLES,
} from "@/features/orders/order-state-machine";
import { orderStatusLabels } from "@/features/orders/order-presentation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OwnerOrderStatusActions({
  orderId,
  status,
  canMarkReady = true,
}: {
  orderId: string;
  status: OrderStatus;
  canMarkReady?: boolean;
}) {
  const t = useText();
  const router = useRouter();
  const available = getAllowedOrderTransitions(status).filter((next) =>
    ORDER_TRANSITION_ROLES[status]?.[next]?.includes("SHOP_OWNER"),
  );
  const statusItems = available.map((value) => ({
    value,
    label: t(orderStatusLabels[value]),
  }));
  const [nextStatus, setNextStatus] = useState<OrderStatus | null>(
    available[0] ?? null,
  );
  const [pending, setPending] = useState(false);
  if (!available.length) return null;

  async function transition() {
    if (
      !nextStatus ||
      pending ||
      (nextStatus === "READY_FOR_DELIVERY" && !canMarkReady)
    )
      return;
    setPending(true);
    try {
      const response = await fetch(`/api/owner/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(
          t(payload?.error?.message ?? "Unable to update this order."),
        );
        return;
      }
      toast.success(t("Order status updated."));
      router.refresh();
    } catch {
      toast.error(t("Unable to update this order."));
    } finally {
      setPending(false);
    }
  }
  return (
    <Card
      as="section"
      className="mt-4 gap-0 border border-border p-4 ring-0 sm:p-5"
      aria-label={t("Order actions")}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 basis-52">
          <Label htmlFor="owner-order-status">{t("Update order status")}</Label>
          <Select
            value={nextStatus}
            items={statusItems}
            disabled={pending}
            onValueChange={(value) => {
              if (value && available.includes(value)) setNextStatus(value);
            }}
          >
            <SelectTrigger
              id="owner-order-status"
              className="mt-1.5 h-10 w-full data-[size=default]:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="min-w-0">
              {available.map((value) => (
                <SelectItem
                  key={value}
                  value={value}
                  disabled={value === "READY_FOR_DELIVERY" && !canMarkReady}
                >
                  {t(orderStatusLabels[value])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          className="h-10"
          variant={nextStatus === "REJECTED" ? "destructive" : "success"}
          disabled={
            pending ||
            !nextStatus ||
            (nextStatus === "READY_FOR_DELIVERY" && !canMarkReady)
          }
          onClick={transition}
        >
          <Check aria-hidden="true" />
          {pending ? t("Updating…") : t("Update status")}
        </Button>
      </div>
      {!canMarkReady ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t(
            status === "PREPARING"
              ? "Confirm every KG packed weight before marking the order ready."
              : "Choose Preparing to confirm KG packed weights before marking this order ready.",
          )}
        </p>
      ) : null}
    </Card>
  );
}
