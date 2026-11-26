import { z } from "zod";
import {
  mobileSchema,
  optionalAccountEmailSchema,
  personNameSchema,
} from "@/lib/account-identity";

export const orderStaffSchema = z
  .object({
    firstName: personNameSchema,
    lastName: personNameSchema,
    phone: mobileSchema,
    email: optionalAccountEmailSchema,
    assignedShopId: z.uuid().optional(),
  })
  .strict();
export const staffStatusSchema = z
  .object({ status: z.enum(["ACTIVE", "INACTIVE"]) })
  .strict();
export type OrderStaffInput = z.infer<typeof orderStaffSchema>;
