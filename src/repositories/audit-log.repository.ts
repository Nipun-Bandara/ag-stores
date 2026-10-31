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
}> & { actorName: string | null; entityName: string | null };

export interface AuditLogFilters {
  action?: AuditAction;
  entityType?: AuditEntityType;
}

export interface AuditLogRepository {
  findMany(
    filters: AuditLogFilters,
    pagination?: { page: number; pageSize: number },
  ): Promise<AuditLogRecord[]>;
}

export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findMany(
    filters: AuditLogFilters,
    pagination?: { page: number; pageSize: number },
  ): Promise<AuditLogRecord[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(pagination
        ? { skip: (pagination.page - 1) * pagination.pageSize }
        : {}),
      take: pagination ? pagination.pageSize + 1 : 100,
      select: auditLogSelect,
    });
    if (!logs.length) return [];

    const entityIds = (type: AuditEntityType) => [
      ...new Set(
        logs
          .filter((log) => log.entityType === type)
          .map((log) => log.entityId),
      ),
    ];
    const userIds = [
      ...new Set([...logs.map((log) => log.actorId), ...entityIds("USER")]),
    ];
    const shopIds = entityIds("SHOP");
    const productIds = entityIds("PRODUCT");
    const orderIds = entityIds("ORDER");
    const [users, shops, products, orders] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      }),
      shopIds.length
        ? this.prisma.shop.findMany({
            where: { id: { in: shopIds } },
            select: { id: true, name: true },
          })
        : [],
      productIds.length
        ? this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, nameEn: true },
          })
        : [],
      orderIds.length
        ? this.prisma.order.findMany({
            where: { id: { in: orderIds } },
            select: { id: true, shop: { select: { name: true } } },
          })
        : [],
    ]);
    const userNames = new Map(users.map((user) => [user.id, user.name]));
    const names = {
      USER: userNames,
      SHOP: new Map(shops.map((shop) => [shop.id, shop.name])),
      PRODUCT: new Map(products.map((product) => [product.id, product.nameEn])),
      ORDER: new Map(orders.map((order) => [order.id, order.shop.name])),
    };
    return logs.map((log) => ({
      ...log,
      actorName: userNames.get(log.actorId) ?? null,
      entityName: names[log.entityType].get(log.entityId) ?? null,
    }));
  }
}
