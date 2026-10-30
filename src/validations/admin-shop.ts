import { z } from "zod";

import { shopSettingsFieldsSchema } from "@/validations/shop-settings";

export const adminShopIdSchema = z.uuid();

export const adminShopInputSchema = shopSettingsFieldsSchema.extend({
  ownerId: z.uuid(),
});

export const adminShopStatusSchema = z
  .object({ isActive: z.boolean() })
  .strict();

export type AdminShopInput = z.infer<typeof adminShopInputSchema>;
export type AdminShopStatusInput = z.infer<typeof adminShopStatusSchema>;
