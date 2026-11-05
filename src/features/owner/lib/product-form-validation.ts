import * as Yup from "yup";
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

export function productFormValidation(
  t: (text: string) => string,
  options: ProductFormOptions,
) {
  const quantity = (positive = false, increment = false) =>
    Yup.string()
      .required(t("Required"))
      .test(
        "quantity",
        t("Enter a valid quantity for the selected selling unit."),
        function (value) {
          if (!value || !/^\d{1,10}(?:\.\d{1,3})?$/.test(value)) return false;
          const amount = Number(value);
          return (
            amount <= 2147483647 &&
            amount >=
              (positive
                ? this.parent.sellingUnit === "KG"
                  ? increment
                    ? 0.001
                    : 0.002
                  : 1
                : 0) &&
            (this.parent.sellingUnit === "KG" || Number.isInteger(amount))
          );
        },
      );
  return Yup.object({
    shopId: Yup.string()
      .required(t("Select a shop"))
      .test("shop", t("Select a shop"), (value) =>
        options.shops.some((shop) => shop.id === value),
      ),
    categoryId: Yup.string()
      .required(t("Select a category"))
      .test("category", t("Select a category"), function (value) {
        return options.categories.some(
          (category) =>
            category.id === value && category.shopId === this.parent.shopId,
        );
      }),
    sellingUnit: Yup.string().oneOf(["UNIT", "KG"]).required(t("Required")),
    nameEn: Yup.string()
      .trim()
      .required(t("Required"))
      .max(180, t("Use at most 180 characters.")),
    nameSi: Yup.string().max(180, t("Use at most 180 characters.")),
    itemCode: Yup.string()
      .trim()
      .required(t("Item code is required."))
      .max(100, t("Use at most 100 characters.")),
    barcode: Yup.string().max(100, t("Use at most 100 characters.")),
    descriptionEn: Yup.string().max(5000, t("Use at most 5000 characters.")),
    descriptionSi: Yup.string().max(5000, t("Use at most 5000 characters.")),
    price: Yup.string()
      .required(t("Required"))
      .matches(
        /^\d{1,10}(?:\.\d{1,2})?$/,
        t("Enter a valid regular price with up to two decimal places."),
      ),
    stockQuantity: quantity(),
    lowStockThreshold: quantity(),
    minimumOrderQuantity: quantity(true),
    orderingIncrement: quantity(true, true),
    discountTiers: Yup.array()
      .max(4, t("A product can have at most four discount tiers."))
      .test("pricing", function (drafts) {
        const values = this.parent as ProductFormValues;
        if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(values.price)) return true;
        try {
          pricingDraft(values.price, (drafts as TierDraft[]) ?? [], {
            sellingUnit: values.sellingUnit,
            minimumOrderQuantity: Number(values.minimumOrderQuantity),
            orderingIncrement: Number(values.orderingIncrement),
          });
          return true;
        } catch (error) {
          return this.createError({
            message: t(
              error instanceof Error
                ? error.message
                : "Invalid discount tiers.",
            ),
          });
        }
      }),
    isAvailable: Yup.boolean(),
  });
}
