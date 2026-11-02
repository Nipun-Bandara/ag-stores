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

export const stockQuantitySchema = z
  .preprocess(
    (value) => (typeof value === "number" ? String(value) : value),
    z
      .string()
      .trim()
      .regex(
        /^\d{1,10}(?:\.\d{1,3})?$/,
        "Quantity must have at most three decimal places.",
      ),
  )
  .transform(Number)
  .pipe(z.number().min(0).max(2147483647));
const lowStockThresholdSchema = stockQuantitySchema;

function validateSetup(
  value: {
    sellingUnit: "UNIT" | "KG";
    stockQuantity: number;
    lowStockThreshold?: number | undefined;
    minimumOrderQuantity: number;
    orderingIncrement: number;
  },
  context: z.RefinementCtx,
) {
  for (const field of ["minimumOrderQuantity", "orderingIncrement"] as const) {
    if (value[field] <= 0)
      context.addIssue({
        code: "custom",
        path: [field],
        message: "Minimum and increment must be positive.",
      });
  }
  if (value.sellingUnit === "UNIT") {
    for (const field of [
      "stockQuantity",
      "lowStockThreshold",
      "minimumOrderQuantity",
      "orderingIncrement",
    ] as const) {
      if (value[field] !== undefined && !Number.isInteger(value[field]))
        context.addIssue({
          code: "custom",
          path: [field],
          message: "UNIT quantities must be whole numbers.",
        });
    }
  }
}

const secureImageUrlSchema = z
  .url()
  .max(2048)
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Image URL must use HTTPS.",
  });

const productFields = {
  itemCode: z.string().trim().min(1, "Item code is required.").max(100),
  barcode: nullableText(100),
  sellingUnit: z.enum(["UNIT", "KG"]).default("UNIT"),
  minimumOrderQuantity: stockQuantitySchema.default(1),
  orderingIncrement: stockQuantitySchema.default(1),
  categoryId: z.uuid(),
  nameEn: z.string().trim().min(1).max(180),
  nameSi: nullableText(180),
  descriptionEn: nullableText(5000),
  descriptionSi: nullableText(5000),
  price: priceSchema,
  stockQuantity: stockQuantitySchema,
  imageUrl: z
    .union([secureImageUrlSchema, z.literal(""), z.null()])
    .optional()
    .transform((value) => value || null),
  isAvailable: z.boolean().optional().default(true),
};

export const productCreateSchema = z
  .object({
    shopId: z.uuid(),
    ...productFields,
    lowStockThreshold: lowStockThresholdSchema.optional().default(5),
  })
  .strict()
  .superRefine(validateSetup)
  .transform((value) => ({
    ...value,
    minimumOrderQuantity: value.sellingUnit === "KG" ? 0.002 : 1,
    // Database precision for weight, not a customer ordering increment.
    orderingIncrement: value.sellingUnit === "KG" ? 0.001 : 1,
  }));

export const productUpdateSchema = z
  .object({
    ...productFields,
    lowStockThreshold: lowStockThresholdSchema.optional(),
  })
  .strict()
  .superRefine(validateSetup);

export const productAvailabilitySchema = z
  .object({ isAvailable: z.boolean() })
  .strict();

export const productStockSchema = z
  .object({
    stockQuantity: stockQuantitySchema,
    lowStockThreshold: lowStockThresholdSchema.optional(),
  })
  .strict();

export const productIdSchema = z.uuid();
export const productCategoryFilterSchema = z.uuid();
export const productSearchSchema = z.string().trim().max(180);
export const productInventoryStatusSchema = z.enum([
  "OUT_OF_STOCK",
  "LOW_STOCK",
  "AVAILABLE",
]);

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductAvailabilityInput = z.infer<
  typeof productAvailabilitySchema
>;
export type ProductStockInput = z.infer<typeof productStockSchema>;
export type ProductInventoryStatus = z.infer<
  typeof productInventoryStatusSchema
>;
