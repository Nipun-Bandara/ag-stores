import { z } from "zod";

export const createDeliveryBatchSchema = z
  .object({
    orderIds: z.array(z.uuid()).min(1).max(50),
  })
  .strict()
  .superRefine(({ orderIds }, context) => {
    const seen = new Set<string>();
    orderIds.forEach((orderId, index) => {
      if (seen.has(orderId)) {
        context.addIssue({
          code: "custom",
          path: ["orderIds", index],
          message: "Each order can be selected only once.",
        });
      }
      seen.add(orderId);
    });
  });

export type CreateDeliveryBatchInput = z.infer<
  typeof createDeliveryBatchSchema
>;
