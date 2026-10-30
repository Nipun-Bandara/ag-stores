import { OrderStatus, type PrismaClient } from "@/generated/prisma/client";

export interface OwnerDashboardStatusCount {
  status: OrderStatus;
  count: number;
}

export interface OwnerDashboardLowStockProduct {
  id: string;
  nameEn: string;
  nameSi: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  shopName: string;
}

export interface OwnerDashboardAggregate {
  ordersToday: number;
  statusCounts: OwnerDashboardStatusCount[];
  deliveredToday: number;
  revenueToday: string;
  lowStockProducts: OwnerDashboardLowStockProduct[];
}

export interface OwnerDashboardRepository {
  aggregateOwned(
    ownerId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<OwnerDashboardAggregate>;
}

export class PrismaOwnerDashboardRepository implements OwnerDashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async aggregateOwned(
    ownerId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<OwnerDashboardAggregate> {
    const ownedShop = { shop: { ownerId } } as const;
    const deliveredTodayWhere = {
      ...ownedShop,
      status: OrderStatus.DELIVERED,
      updatedAt: { gte: dayStart, lt: dayEnd },
    } as const;

    const [ordersToday, statusGroups, delivered, lowStockProducts] =
      await Promise.all([
        this.prisma.order.count({
          where: {
            ...ownedShop,
            createdAt: { gte: dayStart, lt: dayEnd },
          },
        }),
        this.prisma.order.groupBy({
          by: ["status"],
          where: ownedShop,
          _count: { _all: true },
        }),
        this.prisma.order.aggregate({
          where: deliveredTodayWhere,
          _count: { _all: true },
          _sum: { total: true },
        }),
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
            nameSi: true,
            stockQuantity: true,
            lowStockThreshold: true,
            shop: { select: { name: true } },
          },
        }),
      ]);

    return {
      ordersToday,
      statusCounts: statusGroups.map(({ status, _count }) => ({
        status,
        count: _count._all,
      })),
      deliveredToday: delivered._count._all,
      revenueToday: delivered._sum.total?.toFixed(2) ?? "0.00",
      lowStockProducts: lowStockProducts.map(({ shop, ...product }) => ({
        ...product,
        shopName: shop.name,
      })),
    };
  }
}
