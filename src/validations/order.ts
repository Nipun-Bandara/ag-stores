import { z } from "zod";

import { OrderStatus } from "@/generated/prisma/client";

export const orderIdSchema = z.uuid();

export const orderStatusTransitionSchema = z.object({
  status: z.enum(OrderStatus),
  note: z.string().trim().max(500).optional(),
});

export const customerOrderCancellationSchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export type OrderStatusTransitionInput = z.infer<
  typeof orderStatusTransitionSchema
>;

export type CustomerOrderCancellationInput = z.infer<
  typeof customerOrderCancellationSchema
>;
