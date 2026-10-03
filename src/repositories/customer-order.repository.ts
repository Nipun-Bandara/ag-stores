import {
  Prisma,
  type OrderStatus,
  type PrismaClient,
} from "@/generated/prisma/client";

const customerOrderListSelect = {
  id: true,
  status: true,
  total: true,
  createdAt: true,
  updatedAt: true,
  shop: { select: { name: true } },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

const customerOrderDetailSelect = {
  id: true,
  status: true,
  paymentMethod: true,
  subtotal: true,
  deliveryFee: true,
  total: true,
  customerNote: true,
  cancelledAt: true,
  cancellationReason: true,
  createdAt: true,
  updatedAt: true,
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
      productId: true,
      quantity: true,
      unitPrice: true,
      product: { select: { nameEn: true, nameSi: true, imageUrl: true } },
    },
  },
  statusHistory: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      createdAt: true,
    },
  },
} satisfies Prisma.OrderSelect;

export type CustomerOrderListRecord = Prisma.OrderGetPayload<{
  select: typeof customerOrderListSelect;
}>;

export type CustomerOrderDetailRecord = Prisma.OrderGetPayload<{
  select: typeof customerOrderDetailSelect;
}>;

export interface CustomerOrderRepository {
  findManyForCustomer(
    customerId: string,
    statuses: readonly OrderStatus[],
  ): Promise<CustomerOrderListRecord[]>;
  findForCustomer(
    customerId: string,
    orderId: string,
  ): Promise<CustomerOrderDetailRecord | null>;
}

export class PrismaCustomerOrderRepository implements CustomerOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findManyForCustomer(
    customerId: string,
    statuses: readonly OrderStatus[],
  ): Promise<CustomerOrderListRecord[]> {
    return this.prisma.order.findMany({
      where: { customerId, status: { in: [...statuses] } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: customerOrderListSelect,
    });
  }

  findForCustomer(
    customerId: string,
    orderId: string,
  ): Promise<CustomerOrderDetailRecord | null> {
    return this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      select: customerOrderDetailSelect,
    });
  }
}
