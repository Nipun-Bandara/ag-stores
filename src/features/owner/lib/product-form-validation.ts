import { z } from "zod";

import {
  alwaysRun,
  formikValidator,
  requiredText,
} from "@/lib/form-validation";
import {
  pricingDraft,
  type TierDraft,
} from "@/features/owner/components/discount-tier-editor";
import type { ProductFormOptions } from "@/services/product.service";

export interface ProductFormValues {
  shopId: string;
  categoryId: string;
  sellingUnit: "UNIT" | "KG";
  nameEn: string;
  nameSi: string;
  itemCode: string;
  barcode: string;
  descriptionEn: string;
  descriptionSi: string;
  price: string;
  stockQuantity: string;
  lowStockThreshold: string;
  minimumOrderQuantity: string;
  orderingIncrement: string;
  discountTiers: TierDraft[];
  isAvailable: boolean;
}

const QUANTITY_PATTERN = /^\d{1,10}(?:\.\d{1,3})?$/;
const PRICE_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/;

type QuantityField =
  | "stockQuantity"
  | "lowStockThreshold"
  | "minimumOrderQuantity"
  | "orderingIncrement";

/** Smallest allowed value for each quantity field, by selling unit. */
function quantityFloor(field: QuantityField, sellingUnit: string): number {
  if (field === "stockQuantity" || field === "lowStockThreshold") return 0;
  if (sellingUnit !== "KG") return 1;
  return field === "orderingIncrement" ? 0.001 : 0.002;
}

function quantityValidForUnit(
  value: string,
  field: QuantityField,
  sellingUnit: string,
): boolean {
  if (!QUANTITY_PATTERN.test(value)) return false;
  const amount = Number(value);
  return (
    amount <= 2147483647 &&
    amount >= quantityFloor(field, sellingUnit) &&
    (sellingUnit === "KG" || Number.isInteger(amount))
  );
}

function maxLength(t: (text: string) => string, limit: number) {
  return z.string().max(limit, t(`Use at most ${limit} characters.`));
}

export function productFormValidation(
  t: (text: string) => string,
  options: ProductFormOptions,
) {
  const quantityFields: QuantityField[] = [
    "stockQuantity",
    "lowStockThreshold",
    "minimumOrderQuantity",
    "orderingIncrement",
  ];
  const schema = z
    .object({
      shopId: z
        .string()
        .refine(
          (value) => options.shops.some((shop) => shop.id === value),
          t("Select a shop"),
        ),
      categoryId: z.string().min(1, t("Select a category")),
      sellingUnit: z.enum(["UNIT", "KG"], t("Required")),
      nameEn: requiredText(t).refine(
        (value) => value.trim().length <= 180,
        t("Use at most 180 characters."),
      ),
      nameSi: maxLength(t, 180),
      itemCode: z
        .string()
        .refine((value) => value.trim().length > 0, t("Item code is required."))
        .refine(
          (value) => value.trim().length <= 100,
          t("Use at most 100 characters."),
        ),
      barcode: maxLength(t, 100),
      descriptionEn: maxLength(t, 5000),
      descriptionSi: maxLength(t, 5000),
      price: requiredText(t).refine(
        (value) => !value || PRICE_PATTERN.test(value),
        t("Enter a valid regular price with up to two decimal places."),
      ),
      stockQuantity: requiredText(t),
      lowStockThreshold: requiredText(t),
      minimumOrderQuantity: requiredText(t),
      orderingIncrement: requiredText(t),
      discountTiers: z
        .array(z.custom<TierDraft>())
        .max(4, t("A product can have at most four discount tiers.")),
      isAvailable: z.boolean(),
    })
    .superRefine((values: ProductFormValues, context) => {
      if (
        values.categoryId &&
        !options.categories.some(
          (category) =>
            category.id === values.categoryId &&
            category.shopId === values.shopId,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["categoryId"],
          message: t("Select a category"),
        });
      }

      for (const field of quantityFields) {
        const value = values[field];
        if (value && !quantityValidForUnit(value, field, values.sellingUnit)) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: t("Enter a valid quantity for the selected selling unit."),
          });
        }
      }

      if (!PRICE_PATTERN.test(values.price)) return;
      try {
        pricingDraft(values.price, values.discountTiers ?? [], {
          sellingUnit: values.sellingUnit,
          minimumOrderQuantity: Number(values.minimumOrderQuantity),
          orderingIncrement: Number(values.orderingIncrement),
        });
      } catch (error) {
        context.addIssue({
          code: "custom",
          path: ["discountTiers"],
          message: t(
            error instanceof Error ? error.message : "Invalid discount tiers.",
          ),
        });
      }
    }, alwaysRun);
  return formikValidator<ProductFormValues>(schema);
}
