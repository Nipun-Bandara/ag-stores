"use client";
import { useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import { useState } from "react";
import { toast } from "sonner";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function CustomerOrderCancellation({ orderId }: { orderId: string }) {
  const t = useText();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function cancelOrder() {
    setPending(true);
    try {
      const response = await fetch(`/api/account/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(t(payload?.error?.message ?? "Unable to cancel this order."));
        return;
      }
      toast.success(t("Order cancelled"));
      router.refresh();
    } catch {
      toast.error(t("Unable to cancel this order."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card
      as="section"
      className="gap-0 mt-6 bg-red-50 p-5"
      aria-label={t("Cancel order")}
    >
      <h2 className="font-semibold text-red-950">
        <Text value={t("Cancel this order")} />
      </h2>
      <p className="mt-1 text-sm text-red-800">
        <Text
          value={
            "Cancellation is available only before the shop confirms the order. "
          }
        />
      </p>
      <Label className="mt-4 block text-sm font-medium text-red-950">
        <Text value={"Cancellation reason (optional) "} />
        <Textarea
          value={reason}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          className="mt-2 min-h-24 w-full"
        />
      </Label>
      <Button
        variant="destructive"
        type="button"
        disabled={pending}
        onClick={cancelOrder}
        className="mt-4"
      >
        {pending ? t("Cancelling…") : t("Cancel order")}
      </Button>
    </Card>
  );
}
