"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconActionButton } from "@/components/ui/icon-action-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CartProduct } from "@/features/cart/cart-state";
import { useCart } from "@/features/cart/cart-store";
import { calculatePricing } from "@/lib/pricing";
import {
  displayWeight,
  firstOrderQuantity,
  quantityValid,
  weightToKilograms,
} from "@/lib/quantity";
import type { Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/text";

export function WeightCartDialog({
  product,
  quantity,
  locale,
}: {
  product: CartProduct;
  quantity: number;
  locale: Locale;
}) {
  const { add, updateQuantity, remove } = useCart();
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<"kg" | "g">("kg");
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const minimum = firstOrderQuantity(product);
  const outOfStock = product.stockQuantity < minimum;
  const t = (text: string, params?: Record<string, string | number>) =>
    translate(locale, text, params);
  const inputId = `catalogue-weight-${product.id}`;
  const errorId = `${inputId}-error`;
  let weight: number | undefined;
  try {
    weight = weightToKilograms(draft, unit);
  } catch {
    /* The draft can be incomplete while typing. */
  }
  const valid =
    weight !== undefined &&
    quantityValid(weight, product) &&
    weight <= product.stockQuantity;
  const total = valid
    ? calculatePricing(product.price, weight!, product.discountTiers ?? [])
        .lineTotal
    : null;

  function openEditor() {
    setDraft(displayWeight(quantity || minimum, unit));
    setInvalid(false);
    setOpen(true);
  }
  function apply() {
    if (!valid || weight === undefined) {
      setInvalid(true);
      return;
    }
    if (!quantity && !add(product)) {
      setInvalid(true);
      return;
    }
    if (weight !== quantity && !updateQuantity(product.id, weight)) {
      setInvalid(true);
      return;
    }
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {quantity ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 max-w-full tabular-nums"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={t("Edit weight for {name}", { name: product.name })}
          onClick={openEditor}
        >
          {displayWeight(quantity, unit)} {unit}
        </Button>
      ) : (
        <IconActionButton
          type="button"
          variant="outline"
          aria-haspopup="dialog"
          aria-expanded={open}
          label={t("Add {name} to cart", { name: product.name })}
          disabled={outOfStock}
          onClick={openEditor}
        >
          <Plus aria-hidden="true" />
        </IconActionButton>
      )}
      <DialogContent className="max-w-sm space-y-5">
        <DialogHeader>
          <DialogTitle className="break-words">{product.name}</DialogTitle>
          <DialogDescription>{t("Choose your weight")}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor={inputId}>{t("Quantity")}</Label>
            <div className="mt-2 flex gap-2">
              <Input
                id={inputId}
                type="number"
                inputMode="decimal"
                className="h-10 min-w-0 flex-1 tabular-nums"
                value={draft}
                min={displayWeight(minimum, unit)}
                max={displayWeight(product.stockQuantity, unit)}
                step={unit === "kg" ? "0.001" : "1"}
                aria-label={t(
                  unit === "kg"
                    ? "Weight in kg for {name}"
                    : "Weight in g for {name}",
                  { name: product.name },
                )}
                aria-invalid={invalid}
                aria-describedby={
                  invalid ? `${inputId}-hint ${errorId}` : `${inputId}-hint`
                }
                onChange={(event) => {
                  setDraft(event.currentTarget.value);
                  setInvalid(false);
                }}
              />
              <Select
                value={unit}
                items={[
                  { value: "kg", label: "kg" },
                  { value: "g", label: "g" },
                ]}
                onValueChange={(value) => {
                  if (value !== "kg" && value !== "g") return;
                  if (draft !== "") {
                    try {
                      setDraft(
                        displayWeight(weightToKilograms(draft, unit), value),
                      );
                    } catch {
                      setInvalid(true);
                      return;
                    }
                  }
                  setUnit(value);
                  setInvalid(false);
                }}
              >
                <SelectTrigger
                  className="h-10 w-20 shrink-0 data-[size=default]:h-10"
                  aria-label={t("Weight unit for {name}", {
                    name: product.name,
                  })}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p
              id={`${inputId}-hint`}
              className="mt-2 text-xs text-muted-foreground"
            >
              {t("Minimum {quantity} {unit}", {
                quantity: displayWeight(minimum, unit),
                unit: t(unit),
              })}
            </p>
            {invalid ? (
              <p
                id={errorId}
                role="alert"
                className="mt-2 text-xs text-destructive"
              >
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
          <p className="flex flex-wrap justify-between gap-2 border-t border-border pt-4 text-sm">
            <span className="text-muted-foreground">{t("Line total")}</span>
            <strong className="tabular-nums" aria-live="polite">
              {total ? `LKR ${total}` : "—"}
            </strong>
          </p>
          <DialogFooter className="mt-0 gap-2">
            {quantity ? (
              <IconActionButton
                type="button"
                variant="destructive"
                className="text-white dark:text-black"
                label={t("Remove {name}", { name: product.name })}
                onClick={() => {
                  remove(product.id);
                  setOpen(false);
                }}
              >
                <Trash2 aria-hidden="true" />
              </IconActionButton>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="success" disabled={outOfStock}>
              {t(quantity ? "Update cart" : "Add to cart")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
