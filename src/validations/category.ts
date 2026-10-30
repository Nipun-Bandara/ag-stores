import { z } from "zod";

const nameSiSchema = z
  .union([z.string().trim().max(120), z.null()])
  .optional()
  .transform((value) => value || null);

export const categoryCreateSchema = z
  .object({
    shopId: z.uuid(),
    nameEn: z.string().trim().min(1).max(120),
    nameSi: nameSiSchema,
  })
  .strict();

export const categoryUpdateSchema = z
  .object({
    nameEn: z.string().trim().min(1).max(120),
    nameSi: nameSiSchema,
  })
  .strict();

export const categoryStatusSchema = z
  .object({ status: z.enum(["ACTIVE", "INACTIVE"]) })
  .strict();

export const categoryIdSchema = z.uuid();
export const categoryShopIdSchema = z.uuid();

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type CategoryStatusInput = z.infer<typeof categoryStatusSchema>;
