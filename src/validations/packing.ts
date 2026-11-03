import { z } from "zod";

export const packedWeightUpdateSchema = z
  .object({
    itemId: z.uuid(),
    expectedVersion: z.number().int().nonnegative(),
    packedQuantity: z
      .union([z.string(), z.number()])
      .transform(String)
      .pipe(
        z
          .string()
          .regex(
            /^(?:0|[1-9]\d{0,9})(?:\.\d{1,3})?$/,
            "Packed weight must be positive with at most three decimal places.",
          ),
      ),
    customerContactAgreed: z.boolean().default(false),
    customerContactNote: z.string().trim().max(500).optional(),
  })
  .strict();
export type PackedWeightUpdateInput = z.infer<typeof packedWeightUpdateSchema>;
