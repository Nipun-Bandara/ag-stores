import { z } from "zod";

import { cartItemInputSchema } from "@/validations/cart";

export const checkoutSchema = z
  .object({
    deliveryAddressId: z.uuid(),
    deliveryInstructions: z.string().trim().max(1000).optional(),
    items: z.array(cartItemInputSchema).min(1).max(100),
  })
  .refine(
    ({ items }) =>
      new Set(items.map((item) => item.productId)).size === items.length,
    { message: "Each product may only appear once.", path: ["items"] },
  );

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const orderIdSchema = z.uuid();

/** Opaque per-attempt key from the Idempotency-Key header (e.g. a UUID). */
export const idempotencyKeySchema = z
  .string()
  .trim()
  .regex(
    /^[A-Za-z0-9_-]{8,64}$/,
    "Idempotency-Key must be 8-64 URL-safe characters.",
  );
