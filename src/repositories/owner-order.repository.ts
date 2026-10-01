import {
  Prisma,
  type OrderStatus,
  type PrismaClient,
} from "@/generated/prisma/client";

export interface OwnerOrderFilters {
  status?: OrderStatus;
  createdFrom?: Date;
  createdTo?: Date;
  customer?: string;
  orderId?: string;
}

const ownerOrderListSelect = {
  id: true,
  status: true,
  total: true,
  createdAt: true,
  customer: { select: { name: true, email: true, phone: true } },
  shop: { select: { name: true } },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

const ownerOrderDetailSelect = {
  id: true,
  status: true,
  paymentMethod: true,
  subtotal: true,
  deliveryFee: true,
  total: true,
  customerNote: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { name: true, email: true, phone: true } },
  shop: { select: { name: true } },
  deliveryAddress: {
    select: {
      label: true,
      address: true,
      latitude: true,
      longitude: true,
    },
  },
  items: {
    orderBy: { id: "asc" as const },
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      product: { select: { nameEn: true, nameSi: true } },
    },
  },
  statusHistory: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdAt: true,
      changedBy: { select: { name: true, role: true } },
    },
  },
} satisfies Prisma.OrderSelect;

export type OwnerOrderListRecord = Prisma.OrderGetPayload<{
  select: typeof ownerOrderListSelect;
}>;

export type OwnerOrderDetailRecord = Prisma.OrderGetPayload<{
  select: typeof ownerOrderDetailSelect;
}>;

export interface OwnerOrderStatusCount {
  status: OrderStatus;
  count: number;
}

export interface OwnerOrderRepository {
  findManyOwned(
    ownerId: string,
    filters: OwnerOrderFilters,
  ): Promise<OwnerOrderListRecord[]>;
  countOwnedByStatus(ownerId: string): Promise<OwnerOrderStatusCount[]>;
  findOwnedById(
    ownerId: string,
    orderId: string,
  ): Promise<OwnerOrderDetailRecord | null>;
}

export class PrismaOwnerOrderRepository implements OwnerOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findManyOwned(
    ownerId: string,
    filters: OwnerOrderFilters,
  ): Promise<OwnerOrderListRecord[]> {
    const customer = filters.customer;
    return this.prisma.order.findMany({
      where: {
        shop: { ownerId },
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.orderId ? { id: filters.orderId } : {}),
        ...(filters.createdFrom && filters.createdTo
          ? {
              createdAt: {
                gte: filters.createdFrom,
                lt: filters.createdTo,
              },
            }
          : {}),
        ...(customer
          ? {
              customer: {
                OR: [
                  { name: { contains: customer, mode: "insensitive" } },
                  { email: { contains: customer, mode: "insensitive" } },
                  { phone: { contains: customer, mode: "insensitive" } },
                ],
              },
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: ownerOrderListSelect,
    });
  }

  async countOwnedByStatus(ownerId: string): Promise<OwnerOrderStatusCount[]> {
    const counts = await this.prisma.order.groupBy({
      by: ["status"],
      where: { shop: { ownerId } },
      _count: { _all: true },
    });
    return counts.map(({ status, _count }) => ({
      status,
      count: _count._all,
    }));
  }

  findOwnedById(
    ownerId: string,
    orderId: string,
  ): Promise<OwnerOrderDetailRecord | null> {
    return this.prisma.order.findFirst({
      where: { id: orderId, shop: { ownerId } },
      select: ownerOrderDetailSelect,
    });
  }
}
