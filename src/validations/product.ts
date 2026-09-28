import { z } from "zod";

const nullableText = (maximum: number) =>
  z
    .union([z.string().trim().max(maximum), z.null()])
    .optional()
    .transform((value) => value || null);

const priceSchema = z
  .preprocess(
    (value) => (typeof value === "number" ? String(value) : value),
    z
      .string()
      .trim()
      .regex(
        /^\d{1,10}(?:\.\d{1,2})?$/,
        "Price must be a non-negative amount with at most 2 decimal places.",
      ),
  )
  .transform((value) => {
    const [whole = "0", fraction = ""] = value.split(".");
    return `${BigInt(whole).toString()}.${fraction.padEnd(2, "0")}`;
  });

const stockQuantitySchema = z.coerce
  .number({ error: "Stock quantity must be a number." })
  .int("Stock quantity must be a whole number.")
  .min(0, "Stock quantity cannot be negative.")
  .max(2_147_483_647);

const productFields = {
  categoryId: z.uuid(),
  nameEn: z.string().trim().min(1).max(180),
  nameSi: nullableText(180),
  descriptionEn: nullableText(5000),
  descriptionSi: nullableText(5000),
  price: priceSchema,
  stockQuantity: stockQuantitySchema,
  imageUrl: z
    .union([z.url().max(2048), z.literal(""), z.null()])
    .optional()
    .transform((value) => value || null),
  isAvailable: z.boolean().optional().default(true),
};

export const productCreateSchema = z
  .object({ shopId: z.uuid(), ...productFields })
  .strict();

export const productUpdateSchema = z.object(productFields).strict();

export const productAvailabilitySchema = z
  .object({ isAvailable: z.boolean() })
  .strict();

export const productStockSchema = z
  .object({ stockQuantity: stockQuantitySchema })
  .strict();

export const productIdSchema = z.uuid();
export const productCategoryFilterSchema = z.uuid();
export const productSearchSchema = z.string().trim().max(180);

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductAvailabilityInput = z.infer<
  typeof productAvailabilitySchema
>;
export type ProductStockInput = z.infer<typeof productStockSchema>;
