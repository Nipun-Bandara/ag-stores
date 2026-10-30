import {
  OrderStatus,
  Prisma,
  type PrismaClient,
  UserRole,
} from "@/generated/prisma/client";

const assignmentSelect = {
  assignedShop: {
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
    },
  },
} satisfies Prisma.UserSelect;

const availableOrderSelect = {
  id: true,
  total: true,
  createdAt: true,
  deliveryAddress: {
    select: { address: true, latitude: true, longitude: true },
  },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

export type DeliveryShopAssignment = Prisma.UserGetPayload<{
  select: typeof assignmentSelect;
}>["assignedShop"];

export type AvailableDeliveryOrderRecord = Prisma.OrderGetPayload<{
  select: typeof availableOrderSelect;
}>;

export interface DeliveryOrderRepository {
  findAssignedShop(deliveryPersonId: string): Promise<DeliveryShopAssignment>;
  findAvailableOrders(
    shopId: string,
    createdAfter?: Date,
  ): Promise<AvailableDeliveryOrderRecord[]>;
}

export class PrismaDeliveryOrderRepository implements DeliveryOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAssignedShop(
    deliveryPersonId: string,
  ): Promise<DeliveryShopAssignment> {
    const user = await this.prisma.user.findFirst({
      where: { id: deliveryPersonId, role: UserRole.DELIVERY_PERSON },
      select: assignmentSelect,
    });
    return user?.assignedShop ?? null;
  }

  findAvailableOrders(
    shopId: string,
    createdAfter?: Date,
  ): Promise<AvailableDeliveryOrderRecord[]> {
    return this.prisma.order.findMany({
      where: {
        shopId,
        status: OrderStatus.READY_FOR_DELIVERY,
        batchAssignment: null,
        ...(createdAfter ? { createdAt: { gte: createdAfter } } : {}),
      },
      select: availableOrderSelect,
    });
  }
}
