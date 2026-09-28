import { z } from "zod";

export const cartItemInputSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1),
});

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
