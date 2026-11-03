"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { useCart } from "@/features/cart/cart-store";
import type { CartProduct } from "@/features/cart/cart-state";
import { firstOrderQuantity, quantityValid } from "@/lib/quantity";
import { translate } from "@/lib/i18n/text";
import type { Locale } from "@/lib/i18n/config";

export function WeightCartControl({
  product,
  quantity,
  locale,
}: {
  product: CartProduct;
  quantity: number;
  locale: Locale;
}) {
  const { add, updateQuantity, remove } = useCart();
  const [draft, setDraft] = useState(quantity ? String(quantity) : "");
  const [invalid, setInvalid] = useState(false);
  const minimum = firstOrderQuantity(product);
  const outOfStock = product.stockQuantity < minimum;
  const errorId = `weight-error-${product.id}`;
  const t = (text: string, params?: Record<string, string | number>) =>
    translate(locale, text, params);

  function apply() {
    const weight = Number(draft);
    if (!quantityValid(draft, product) || weight > product.stockQuantity) {
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
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/50 p-1">
        <Input
          type="number"
          inputMode="decimal"
          aria-label={t("Weight in kg for {name}", { name: product.name })}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          min={minimum}
          max={product.stockQuantity}
          step="0.001"
          placeholder={String(minimum)}
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
          className="h-9 w-24 tabular-nums"
        />
        <span className="mr-1 text-sm text-muted-foreground">{t("kg")}</span>
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
        {t("Minimum {quantity} kg", { quantity: minimum })}
      </p>
      {invalid ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {t(
            "Enter at least {minimum} kg, up to {maximum} kg, with at most 3 decimal places.",
            { minimum, maximum: product.stockQuantity },
          )}
        </p>
      ) : null}
    </div>
  );
}
