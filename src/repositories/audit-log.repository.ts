import {
  type AuditAction,
  type AuditEntityType,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";

const auditLogSelect = {
  id: true,
  actorId: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  createdAt: true,
} satisfies Prisma.AuditLogSelect;

export type AuditLogRecord = Prisma.AuditLogGetPayload<{
  select: typeof auditLogSelect;
}>;

export interface AuditLogFilters {
  action?: AuditAction;
  entityType?: AuditEntityType;
}

export interface AuditLogRepository {
  findMany(filters: AuditLogFilters): Promise<AuditLogRecord[]>;
}

export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany(filters: AuditLogFilters): Promise<AuditLogRecord[]> {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: auditLogSelect,
    });
  }
}
