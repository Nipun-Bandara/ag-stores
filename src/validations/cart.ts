import { z } from "zod";
import { quantityMilli } from "@/lib/quantity";

export const cartItemInputSchema = z
  .object({
    productId: z.uuid(),
    quantity: z
      .number()
      .positive()
      .refine((value) => {
        try {
          quantityMilli(value);
          return true;
        } catch {
          return false;
        }
      }, "Quantity must have at most three decimal places."),
    sellingUnit: z.enum(["UNIT", "KG"]).optional(),
  })
  .strip();

export const cartValidationSchema = z
  .object({
    items: z.array(cartItemInputSchema).min(1).max(100),
  })
  .refine(
    ({ items }) =>
      new Set(items.map((item) => item.productId)).size === items.length,
    {
      message: "Each product may only appear once in the cart.",
      path: ["items"],
    },
  );

export type CartValidationInput = z.infer<typeof cartValidationSchema>;
