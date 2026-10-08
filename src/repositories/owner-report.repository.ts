import {
  OrderStatus,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";

export interface OwnerReportQuery {
  from: Date;
  toExclusive: Date;
  status?: OrderStatus;
}

export interface DailyOrderMetric {
  date: string;
  orders: number;
}

export interface DailyRevenueMetric {
  date: string;
  revenue: string;
}

export interface StatusMetric {
  status: OrderStatus;
  orders: number;
}

export interface BestSellingProductMetric {
  productId: string;
  nameEn: string;
  nameSi: string | null;
  shopName: string;
  quantitySold: number;
}

export interface ReportLowStockProduct {
  productId: string;
  nameEn: string;
  shopName: string;
  stockQuantity: number;
  lowStockThreshold: number;
}

export interface OwnerReportAggregate {
  dailyOrders: DailyOrderMetric[];
  dailyRevenue: DailyRevenueMetric[];
  ordersByStatus: StatusMetric[];
  bestSellingProducts: BestSellingProductMetric[];
  lowStockProducts: ReportLowStockProduct[];
  completedDeliveries: number;
  failedDeliveries: number;
}

export interface OwnerReportRepository {
  aggregateOwned(
    ownerId: string,
    query: OwnerReportQuery,
  ): Promise<OwnerReportAggregate>;
}

interface DailyOrderRow {
  date: string;
  orders: number;
}

interface DailyRevenueRow {
  date: string;
  revenue: string;
}

interface BestSellingProductRow {
  productId: string;
  nameEn: string;
  nameSi: string | null;
  shopName: string;
  quantitySold: number;
}

function statusSql(status: OrderStatus | undefined) {
  return status
    ? Prisma.sql`AND o."status" = ${status}::"OrderStatus"`
    : Prisma.empty;
}

export class PrismaOwnerReportRepository implements OwnerReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async aggregateOwned(
    ownerId: string,
    query: OwnerReportQuery,
  ): Promise<OwnerReportAggregate> {
    const orderWhere = {
      shop: { ownerId },
      createdAt: { gte: query.from, lt: query.toExclusive },
      ...(query.status ? { status: query.status } : {}),
    } satisfies Prisma.OrderWhereInput;
    const filteredStatus = statusSql(query.status);

    const [
      dailyOrders,
      dailyRevenue,
      statusGroups,
      bestSellingProducts,
      lowStockProducts,
      completedDeliveries,
      failedDeliveries,
    ] = await Promise.all([
      this.prisma.$queryRaw<DailyOrderRow[]>`
        SELECT
          TO_CHAR((o."createdAt" AT TIME ZONE 'Asia/Colombo')::date, 'YYYY-MM-DD') AS "date",
          COUNT(*)::int AS "orders"
        FROM "orders" o
        INNER JOIN "shops" s ON s."id" = o."shopId"
        WHERE s."ownerId" = ${ownerId}::uuid
          AND o."createdAt" >= ${query.from}
          AND o."createdAt" < ${query.toExclusive}
          ${filteredStatus}
        GROUP BY 1
        ORDER BY 1
      `,
      this.prisma.$queryRaw<DailyRevenueRow[]>`
        SELECT
          TO_CHAR((o."createdAt" AT TIME ZONE 'Asia/Colombo')::date, 'YYYY-MM-DD') AS "date",
          COALESCE(SUM(o."total"), 0)::text AS "revenue"
        FROM "orders" o
        INNER JOIN "shops" s ON s."id" = o."shopId"
        WHERE s."ownerId" = ${ownerId}::uuid
          AND o."createdAt" >= ${query.from}
          AND o."createdAt" < ${query.toExclusive}
          AND o."status" = 'DELIVERED'::"OrderStatus"
          ${filteredStatus}
        GROUP BY 1
        ORDER BY 1
      `,
      this.prisma.order.groupBy({
        by: ["status"],
        where: orderWhere,
        _count: { _all: true },
        orderBy: { status: "asc" },
      }),
      this.prisma.$queryRaw<BestSellingProductRow[]>`
        SELECT
          p."id" AS "productId",
          p."nameEn" AS "nameEn",
          p."nameSi" AS "nameSi",
          s."name" AS "shopName",
          SUM(oi."quantity")::int AS "quantitySold"
        FROM "order_items" oi
        INNER JOIN "orders" o ON o."id" = oi."orderId"
        INNER JOIN "products" p ON p."id" = oi."productId"
        INNER JOIN "shops" s ON s."id" = o."shopId"
        WHERE s."ownerId" = ${ownerId}::uuid
          AND o."createdAt" >= ${query.from}
          AND o."createdAt" < ${query.toExclusive}
          AND o."status" NOT IN (
            'CANCELLED'::"OrderStatus",
            'REJECTED'::"OrderStatus",
            'FAILED_DELIVERY'::"OrderStatus"
          )
          ${filteredStatus}
        GROUP BY p."id", p."nameEn", p."nameSi", s."name"
        ORDER BY "quantitySold" DESC, p."nameEn" ASC, p."id" ASC
        LIMIT 10
      `,
      this.prisma.product.findMany({
        where: {
          shop: { ownerId },
          stockQuantity: {
            gt: 0,
            lte: this.prisma.product.fields.lowStockThreshold,
          },
        },
        orderBy: [
          { stockQuantity: "asc" },
          { shop: { name: "asc" } },
          { nameEn: "asc" },
        ],
        select: {
          id: true,
          nameEn: true,
          stockQuantity: true,
          lowStockThreshold: true,
          shop: { select: { name: true } },
        },
      }),
      this.prisma.order.count({
        where:
          query.status && query.status !== OrderStatus.DELIVERED
            ? { id: { in: [] } }
            : { ...orderWhere, status: OrderStatus.DELIVERED },
      }),
      this.prisma.order.count({
        where:
          query.status && query.status !== OrderStatus.FAILED_DELIVERY
            ? { id: { in: [] } }
            : { ...orderWhere, status: OrderStatus.FAILED_DELIVERY },
      }),
    ]);

    return {
      dailyOrders,
      dailyRevenue: dailyRevenue.map((metric) => ({
        ...metric,
        revenue: Number(metric.revenue).toFixed(2),
      })),
      ordersByStatus: statusGroups.map(({ status, _count }) => ({
        status,
        orders: _count._all,
      })),
      bestSellingProducts,
      lowStockProducts: lowStockProducts.map(({ id, shop, ...product }) => ({
        productId: id,
        shopName: shop.name,
        ...product,
      })),
      completedDeliveries,
      failedDeliveries,
    };
  }
}
