import { z } from "zod";

import { UserStatus } from "@/generated/prisma/client";
import {
  mobileSchema,
  optionalAccountEmailSchema,
  personNameSchema,
} from "@/lib/account-identity";

const deliveryStatusSchema = z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE]);

const deliveryPersonnelDetailsSchema = z
  .object({
    firstName: personNameSchema,
    lastName: personNameSchema,
    email: optionalAccountEmailSchema,
    phone: mobileSchema,
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
