import { UserRole } from "@/generated/prisma/client";
import { getDb } from "@/db";
import {
  PrismaAuditLogRepository,
  type AuditLogFilters,
  type AuditLogRepository,
} from "@/repositories/audit-log.repository";
import type { AuthenticatedUser } from "@/types/auth";
import { auditLogPaginationSchema } from "@/validations/audit-log";

export class AuditLogError extends Error {
  constructor(
    readonly code: "ADMIN_ONLY",
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuditLogError";
  }
}

function repository(): AuditLogRepository {
  return new PrismaAuditLogRepository(getDb());
}

export async function listAuditLogs(
  user: AuthenticatedUser,
  filters: AuditLogFilters = {},
  logs: AuditLogRepository = repository(),
) {
  if (user.role !== UserRole.ADMIN) {
    throw new AuditLogError(
      "ADMIN_ONLY",
      "Administrator access is required.",
      403,
    );
  }
  return (await logs.findMany(filters)).map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));
}

export type AuditLogView = Awaited<ReturnType<typeof listAuditLogs>>[number];

export async function getAuditLogPage(
  user: AuthenticatedUser,
  pagination: { page?: unknown; pageSize?: unknown } = {},
  filters: AuditLogFilters = {},
  logs: AuditLogRepository = repository(),
) {
  if (user.role !== UserRole.ADMIN) {
    throw new AuditLogError(
      "ADMIN_ONLY",
      "Administrator access is required.",
      403,
    );
  }
  const { page, pageSize } = auditLogPaginationSchema.parse(pagination);
  const records = await logs.findMany(filters, { page, pageSize });
  return {
    records: records
      .slice(0, pageSize)
      .map((log) => ({ ...log, createdAt: log.createdAt.toISOString() })),
    page,
    pageSize,
    hasPrevious: page > 1,
    hasNext: records.length > pageSize,
  };
}
