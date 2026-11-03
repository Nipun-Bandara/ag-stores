"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useText } from "@/features/i18n/components/locale-provider";
import type { CartItem } from "@/features/cart/cart-state";
import { quantityValid } from "@/lib/quantity";
import { firstOrderQuantity } from "@/lib/quantity";
import { Minus, Plus } from "lucide-react";
import { IconActionButton } from "@/components/ui/icon-action-button";

/** Keep an editing draft so typing 0.125 is possible without coercing intermediate input. */
export function CartQuantityInput({
  item,
  label,
  onChange,
}: {
  item: CartItem;
  label: string;
  onChange: (id: string, quantity: number) => boolean;
}) {
  const t = useText();
  const [draft, setDraft] = useState(String(item.quantity));
  const [invalid, setInvalid] = useState(false);
  function apply() {
    const quantity = Number(draft);
    const valid = quantityValid(draft, item) && quantity <= item.stockQuantity;
    setInvalid(!valid);
    if (valid) onChange(item.id, quantity);
  }
  if (item.sellingUnit !== "KG") {
    return (
      <div
        className="mt-1 inline-flex items-center gap-1 rounded-lg bg-muted/50 p-1"
        role="group"
        aria-label={label}
      >
        <IconActionButton
          type="button"
          variant="ghost"
          label={t("Reduce quantity of {name}", { name: item.name })}
          disabled={item.quantity <= firstOrderQuantity(item)}
          onClick={() => onChange(item.id, item.quantity - 1)}
        >
          <Minus aria-hidden="true" />
        </IconActionButton>
        <span
          className="min-w-6 text-center font-semibold tabular-nums"
          aria-live="polite"
        >
          {item.quantity}
        </span>
        <IconActionButton
          type="button"
          variant="success"
          label={t("Increase quantity of {name}", { name: item.name })}
          disabled={item.quantity + 1 > item.stockQuantity}
          onClick={() => onChange(item.id, item.quantity + 1)}
        >
          <Plus aria-hidden="true" />
        </IconActionButton>
      </div>
    );
  }
  return (
    <>
      <Input
        aria-label={label}
        aria-invalid={invalid}
        type="number"
        min={firstOrderQuantity(item)}
        step="0.001"
        inputMode="decimal"
        max={item.stockQuantity}
        value={draft}
        onChange={(event) => {
          setDraft(event.currentTarget.value);
          setInvalid(false);
        }}
        onBlur={apply}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
        }}
        className="mt-1 block h-9 w-24"
      />
      {invalid ? (
        <span role="alert" className="block text-destructive">
          {t(
            "Enter at least {minimum} kg, up to {maximum} kg, with at most 3 decimal places.",
            { minimum: firstOrderQuantity(item), maximum: item.stockQuantity },
          )}
        </span>
      ) : null}
    </>
  );
}
