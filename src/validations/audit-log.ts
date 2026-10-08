import { AuditAction, AuditEntityType } from "@/generated/prisma/client";
import { z } from "zod";

export const auditLogFiltersSchema = z.object({
  action: z.enum(AuditAction).optional(),
  entityType: z.enum(AuditEntityType).optional(),
});
