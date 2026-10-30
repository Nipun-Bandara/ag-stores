import { z } from "zod";

import { OrderStatus } from "@/generated/prisma/client";

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

export const batchIdSchema = z.uuid();

export const reorderDeliveryBatchSchema = z
  .object({
    orderIds: z.array(z.uuid()).min(1).max(50),
  })
  .strict()
  .superRefine(({ orderIds }, context) => {
    if (new Set(orderIds).size !== orderIds.length) {
      context.addIssue({
        code: "custom",
        path: ["orderIds"],
        message: "Each order can appear only once.",
      });
    }
  });

export const completeDeliveryOrderSchema = z
  .object({
    status: z.enum([OrderStatus.DELIVERED, OrderStatus.FAILED_DELIVERY]),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export type ReorderDeliveryBatchInput = z.infer<
  typeof reorderDeliveryBatchSchema
>;
export type CompleteDeliveryOrderInput = z.infer<
  typeof completeDeliveryOrderSchema
>;
