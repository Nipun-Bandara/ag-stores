import { AuditAction, AuditEntityType } from "@/generated/prisma/enums";
import { z } from "zod";

export const auditLogFiltersSchema = z.object({
  action: z.enum(AuditAction).optional(),
  entityType: z.enum(AuditEntityType).optional(),
});

export const auditLogPageSizes = [10, 25, 50, 100] as const;

export const auditLogPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).catch(1),
  pageSize: z.coerce
    .number()
    .refine((value) => auditLogPageSizes.some((size) => size === value))
    .catch(25),
});
