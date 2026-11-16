import { z } from "zod";
export const recordReturnSchema = z
  .object({
    requestId: z.uuid(),
    orderItemId: z.uuid(),
    quantity: z
      .union([z.string(), z.number()])
      .transform(String)
      .pipe(z.string().regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,3})?$/)),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();
export const returnActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("approve"),
      restock: z.boolean(),
      note: z.string().trim().max(500).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("reject"),
      note: z.string().trim().min(3).max(500),
    })
    .strict(),
  z.object({ action: z.literal("refund-paid") }).strict(),
]);
export type RecordReturnInput = z.infer<typeof recordReturnSchema>;
export type ReturnActionInput = z.infer<typeof returnActionSchema>;
