"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useText } from "@/features/i18n/components/locale-provider";
import type { CartItem } from "@/features/cart/cart-state";
import {
  displayWeight,
  quantityValid,
  weightToKilograms,
} from "@/lib/quantity";
import { firstOrderQuantity } from "@/lib/quantity";
import { Minus, Plus } from "lucide-react";
import { IconActionButton } from "@/components/ui/icon-action-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [unit, setUnit] = useState<"kg" | "g">("kg");
  const [draft, setDraft] = useState(String(item.quantity));
  const [invalid, setInvalid] = useState(false);
  const [previousQuantity, setPreviousQuantity] = useState(item.quantity);
  if (previousQuantity !== item.quantity) {
    setPreviousQuantity(item.quantity);
    setDraft(
      item.sellingUnit === "KG"
        ? displayWeight(item.quantity, unit)
        : String(item.quantity),
    );
    setInvalid(false);
  }
  function apply() {
    let quantity: number;
    try {
      quantity = weightToKilograms(draft, unit);
    } catch {
      setInvalid(true);
      return;
    }
    const valid =
      quantityValid(quantity, item) && quantity <= item.stockQuantity;
    setInvalid(!valid);
    if (valid) onChange(item.id, quantity);
  }
  if (item.sellingUnit !== "KG") {
    return (
      <div
        className="mt-1 inline-flex items-center gap-1 rounded-lg bg-muted/50 p-1 text-foreground"
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
      <div className="mt-1 flex items-center gap-2 text-foreground">
        <Input
          aria-label={label}
          aria-invalid={invalid}
          type="number"
          min={displayWeight(firstOrderQuantity(item), unit)}
          step={unit === "kg" ? "0.001" : "1"}
          inputMode="decimal"
          max={displayWeight(item.stockQuantity, unit)}
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
          className="block h-9 w-24"
        />
        <Select
          value={unit}
          items={[
            { value: "kg", label: "kg" },
            { value: "g", label: "g" },
          ]}
          onValueChange={(value) => {
            if (value !== "kg" && value !== "g") return;
            try {
              if (draft !== "")
                setDraft(displayWeight(weightToKilograms(draft, unit), value));
              setUnit(value);
              setInvalid(false);
            } catch {
              setInvalid(true);
            }
          }}
        >
          <SelectTrigger
            className="h-9 w-16 data-[size=default]:h-9"
            aria-label={t("Weight unit for {name}", { name: item.name })}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-0">
            <SelectItem value="kg">kg</SelectItem>
            <SelectItem value="g">g</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {invalid ? (
        <span role="alert" className="block text-destructive">
          {t(
            unit === "kg"
              ? "Enter at least {minimum} kg, up to {maximum} kg, with at most 3 decimal places."
              : "Enter a whole number of grams from {minimum} g to {maximum} g.",
            {
              minimum: displayWeight(firstOrderQuantity(item), unit),
              maximum: displayWeight(item.stockQuantity, unit),
            },
          )}
        </span>
      ) : null}
    </>
  );
}
