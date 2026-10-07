import { z } from "zod";

import { UserRole, UserStatus } from "@/generated/prisma/client";

export const adminUserIdSchema = z.uuid();

export const adminUserFiltersSchema = z
  .object({
    search: z.string().trim().max(150).optional(),
    role: z.enum(UserRole).optional(),
    status: z.enum(UserStatus).optional(),
  })
  .strict();

export const adminUserStatusSchema = z
  .object({
    status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE]),
  })
  .strict();

export type AdminUserFilters = z.infer<typeof adminUserFiltersSchema>;
export type AdminUserStatusInput = z.infer<typeof adminUserStatusSchema>;
