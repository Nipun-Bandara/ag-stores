import { z } from "zod";

import { UserStatus } from "@/generated/prisma/client";

const deliveryStatusSchema = z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE]);

const deliveryPersonnelDetailsSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    email: z.string().trim().toLowerCase().pipe(z.email().max(320)),
    phone: z
      .string()
      .trim()
      .regex(
        /^\+[1-9]\d{7,14}$/,
        "Use an international number such as +94771234567.",
      ),
    assignedShopId: z.uuid(),
  })
  .strict();

export const deliveryPersonnelCreateSchema =
  deliveryPersonnelDetailsSchema.extend({
    status: deliveryStatusSchema.default(UserStatus.ACTIVE),
  });

export const deliveryPersonnelUpdateSchema = deliveryPersonnelDetailsSchema;

export const deliveryPersonnelStatusSchema = z
  .object({ status: deliveryStatusSchema })
  .strict();

export const deliveryPersonIdSchema = z.uuid();

export type DeliveryPersonnelCreateInput = z.infer<
  typeof deliveryPersonnelCreateSchema
>;
export type DeliveryPersonnelUpdateInput = z.infer<
  typeof deliveryPersonnelUpdateSchema
>;
export type DeliveryPersonnelStatusInput = z.infer<
  typeof deliveryPersonnelStatusSchema
>;
