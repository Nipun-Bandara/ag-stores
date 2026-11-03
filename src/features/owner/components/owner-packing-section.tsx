"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";
import { BilingualText } from "@/features/i18n/components/bilingual-text";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  exceedsWeightAllowance,
  milliToDecimal,
  packedLineTotal,
  packedWeightValid,
  weightDifferenceMilli,
} from "@/lib/packing";
import { minorUnitsToMoney, moneyToMinorUnits } from "@/lib/money";
import type { getOwnerOrder } from "@/services/owner-order.service";

type Order = Awaited<ReturnType<typeof getOwnerOrder>>;
type Item = Order["items"][number];

function PackingRow({ order, item }: { order: Order; item: Item }) {
  const t = useText();
  const router = useRouter();
  const [weight, setWeight] = useState(
    String(item.packedQuantity ?? item.quantity),
  );
  const [agreed, setAgreed] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const valid = packedWeightValid(weight);
  const difference = valid
    ? weightDifferenceMilli(item.quantity, weight)
    : null;
  const outside =
    valid &&
    exceedsWeightAllowance(
      item.quantity,
      weight,
      order.weightDifferenceAllowancePct,
    );
  const newLine = valid ? packedLineTotal(item.unitPrice, weight) : null;
  const newTotal = newLine
    ? minorUnitsToMoney(
        (
          BigInt(moneyToMinorUnits(order.total)) -
          BigInt(moneyToMinorUnits(item.lineTotal)) +
          BigInt(moneyToMinorUnits(newLine))
        ).toString(),
      )
    : null;

  async function save() {
    if (!valid || (outside && (!agreed || !note.trim()))) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/owner/orders/${order.id}/packing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          expectedVersion: order.packingVersion,
          packedQuantity: weight,
          customerContactAgreed: agreed,
          customerContactNote: note,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(t(payload.error?.message ?? "Unable to save packed weight."));
        return;
      }
      router.refresh();
    } catch {
      setError(t("Unable to save packed weight."));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 border-t py-4 text-sm">
      <p className="font-semibold">
        <BilingualText english={item.nameEn} sinhala={item.nameSi} />
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <p>
          <Text value="Requested weight" />: {item.quantity} kg
        </p>
        <p>
          <Text value="Previously packed weight" />:{" "}
          {item.packedQuantity === null
            ? t("Not confirmed")
            : `${item.packedQuantity} kg`}
        </p>
      </div>
      <label className="block max-w-xs font-medium">
        <Text value="Actual packed weight (kg)" />
        <Input
          type="number"
          min="0.001"
          step="0.001"
          value={weight}
          onChange={(event) => {
            setWeight(event.target.value);
            setAgreed(false);
            setNote("");
          }}
          className="mt-1"
        />
      </label>
      <p>
        <Text value="Weight difference" />:{" "}
        {difference === null
          ? t("Enter a valid weight")
          : `${difference > BigInt(0) ? "+" : ""}${milliToDecimal(difference)} kg`}
      </p>
      <p>
        <Text value="Agreed rate" />: LKR {item.unitPrice}/kg
      </p>
      <p>
        <Text value="Previous line amount" />: LKR {item.lineTotal} ·{" "}
        <Text value="New line amount" />: {newLine ? `LKR ${newLine}` : "—"}
      </p>
      <p>
        <Text value="Previous order total" />: LKR {order.total} ·{" "}
        <Text value="New order total" />: {newTotal ? `LKR ${newTotal}` : "—"}
      </p>
      {outside ? (
        <div className="space-y-2 rounded-md border p-3">
          <p>
            <Text value="This weight exceeds the shop allowance. Call the customer and record their agreement." />
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
            />
            <Text value="Customer contacted and agreed to this weight" />
          </label>
          <label className="block">
            <Text value="Contact note" />
            <Input
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              className="mt-1"
            />
          </label>
        </div>
      ) : null}
      {error ? (
        <Alert variant="destructive" role="alert">
          {error}
        </Alert>
      ) : null}
      <Button
        type="button"
        disabled={pending || !valid || (outside && (!agreed || !note.trim()))}
        onClick={save}
      >
        {pending ? t("Saving…") : t("Confirm packed weight")}
      </Button>
    </div>
  );
}

export function OwnerPackingSection({ order }: { order: Order }) {
  if (!order.packingRequired) return null;
  const kgItems = order.items.filter((item) => item.sellingUnit === "KG");
  return (
    <Card as="section" className="gap-0 mt-6 p-4 sm:p-5">
      <h2 className="text-lg font-semibold">
        <Text value="KG packing" />
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text value="Confirm every KG weight before marking the order ready. Requested weights and checkout rates stay unchanged." />
      </p>
      {order.status === "PREPARING"
        ? kgItems.map((item) => (
            <PackingRow
              key={`${item.id}:${order.packingVersion}`}
              order={order}
              item={item}
            />
          ))
        : kgItems.map((item) => (
            <p key={item.id} className="mt-3 text-sm">
              <BilingualText english={item.nameEn} sinhala={item.nameSi} />:{" "}
              {item.packedQuantity === null ? "—" : `${item.packedQuantity} kg`}
            </p>
          ))}
    </Card>
  );
}
