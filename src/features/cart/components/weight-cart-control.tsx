"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { useCart } from "@/features/cart/cart-store";
import type { CartProduct } from "@/features/cart/cart-state";
import {
  displayWeight,
  firstOrderQuantity,
  quantityValid,
  weightToKilograms,
} from "@/lib/quantity";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { translate } from "@/lib/i18n/text";
import type { Locale } from "@/lib/i18n/config";

export function WeightCartControl({
  product,
  quantity,
  locale,
  unit,
  onUnitChange,
}: {
  product: CartProduct;
  quantity: number;
  locale: Locale;
  unit: "kg" | "g";
  onUnitChange: (unit: "kg" | "g") => void;
}) {
  const { add, updateQuantity, remove } = useCart();
  const [draft, setDraft] = useState(
    quantity ? displayWeight(quantity, unit) : "",
  );
  const [invalid, setInvalid] = useState(false);
  const minimum = firstOrderQuantity(product);
  const outOfStock = product.stockQuantity < minimum;
  const errorId = `weight-error-${product.id}`;
  const t = (text: string, params?: Record<string, string | number>) =>
    translate(locale, text, params);

  function apply() {
    let weight: number;
    try {
      weight = weightToKilograms(draft, unit);
    } catch {
      setInvalid(true);
      return;
    }
    if (!quantityValid(weight, product) || weight > product.stockQuantity) {
      setInvalid(true);
      return;
    }
    if (!quantity && !add(product)) {
      setInvalid(true);
      return;
    }
    setInvalid(!updateQuantity(product.id, weight));
  }

  return (
    <div className="max-w-full min-w-0 space-y-1">
      <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
        <Input
          type="number"
          inputMode="decimal"
          aria-label={t(
            unit === "kg"
              ? "Weight in kg for {name}"
              : "Weight in g for {name}",
            { name: product.name },
          )}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          min={displayWeight(minimum, unit)}
          max={displayWeight(product.stockQuantity, unit)}
          step={unit === "kg" ? "0.001" : "1"}
          placeholder={displayWeight(minimum, unit)}
          value={draft}
          disabled={outOfStock}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            setInvalid(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }}
          className="h-9 w-20 tabular-nums"
        />
        <Select
          value={unit}
          items={[
            { value: "kg", label: "kg" },
            { value: "g", label: "g" },
          ]}
          disabled={outOfStock}
          onValueChange={(value) => {
            if (value !== "kg" && value !== "g") return;
            if (draft !== "") {
              try {
                setDraft(displayWeight(weightToKilograms(draft, unit), value));
              } catch {
                setInvalid(true);
                return;
              }
            }
            onUnitChange(value);
            setInvalid(false);
          }}
        >
          <SelectTrigger
            className="h-9 w-16 shrink-0 data-[size=default]:h-9"
            aria-label={t("Weight unit for {name}", { name: product.name })}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-0">
            <SelectItem value="kg">kg</SelectItem>
            <SelectItem value="g">g</SelectItem>
          </SelectContent>
        </Select>
        <IconActionButton
          type="button"
          variant="success"
          label={t(
            quantity ? "Update weight for {name}" : "Add {name} to cart",
            { name: product.name },
          )}
          disabled={outOfStock}
          onClick={apply}
        >
          {quantity ? (
            <Check aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
        </IconActionButton>
        {quantity > 0 ? (
          <IconActionButton
            type="button"
            variant="ghost"
            label={t("Remove {name}", { name: product.name })}
            onClick={() => remove(product.id)}
          >
            <Trash2 aria-hidden="true" />
          </IconActionButton>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("Minimum {quantity} {unit}", {
          quantity: displayWeight(minimum, unit),
          unit: t(unit),
        })}
      </p>
      {invalid ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {t(
            unit === "kg"
              ? "Enter at least {minimum} kg, up to {maximum} kg, with at most 3 decimal places."
              : "Enter a whole number of grams from {minimum} g to {maximum} g.",
            {
              minimum: displayWeight(minimum, unit),
              maximum: displayWeight(product.stockQuantity, unit),
            },
          )}
        </p>
      ) : null}
    </div>
  );
}
