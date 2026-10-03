import { getDb } from "@/db";
import { OrderStatus, UserRole } from "@/generated/prisma/client";
import {
  minorUnitsToMoney,
  moneyToMinorUnits,
  multiplyMinorUnits,
} from "@/lib/money";
import {
  PrismaCustomerOrderRepository,
  type CustomerOrderDetailRecord,
  type CustomerOrderListRecord,
  type CustomerOrderRepository,
} from "@/repositories/customer-order.repository";
import type { AuthenticatedUser } from "@/types/auth";

export const ACTIVE_ORDER_STATUSES = [
  OrderStatus.PLACED,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_DELIVERY,
  OrderStatus.ASSIGNED,
  OrderStatus.OUT_FOR_DELIVERY,
] as const;

export const PAST_ORDER_STATUSES = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.REJECTED,
  OrderStatus.FAILED_DELIVERY,
] as const;

export class CustomerOrderError extends Error {
  constructor(
    readonly code: "CUSTOMER_ONLY" | "ORDER_NOT_FOUND",
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CustomerOrderError";
  }
}

function repository(): CustomerOrderRepository {
  return new PrismaCustomerOrderRepository(getDb());
}

function assertCustomer(user: AuthenticatedUser): void {
  if (user.role !== UserRole.CUSTOMER) {
    throw new CustomerOrderError(
      "CUSTOMER_ONLY",
      "Customer access is required.",
      403,
    );
  }
}

function toListView(order: CustomerOrderListRecord) {
  return {
    id: order.id,
    status: order.status,
    shopName: order.shop.name,
    itemCount: order._count.items,
    total: order.total.toFixed(2),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

function toDetailView(order: CustomerOrderDetailRecord) {
  const timeline = [
    { status: OrderStatus.PLACED, createdAt: order.createdAt.toISOString() },
    ...order.statusHistory.map((entry) => ({
      status: entry.toStatus,
      createdAt: entry.createdAt.toISOString(),
    })),
  ];
  if (timeline.at(-1)?.status !== order.status) {
    timeline.push({
      status: order.status,
      createdAt: order.updatedAt.toISOString(),
    });
  }

  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    shopName: order.shop.name,
    subtotal: order.subtotal.toFixed(2),
    deliveryFee: order.deliveryFee.toFixed(2),
    total: order.total.toFixed(2),
    customerNote: order.customerNote,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    deliveryAddress: {
      ...order.deliveryAddress,
      latitude: order.deliveryAddress.latitude.toString(),
      longitude: order.deliveryAddress.longitude.toString(),
    },
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      nameEn: item.product.nameEn,
      nameSi: item.product.nameSi,
      imageUrl: item.product.imageUrl,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: minorUnitsToMoney(
        multiplyMinorUnits(
          moneyToMinorUnits(item.unitPrice.toFixed(2)),
          item.quantity,
        ),
      ),
    })),
    timeline,
  };
}

export async function listCustomerOrders(
  user: AuthenticatedUser,
  orders: CustomerOrderRepository = repository(),
) {
  assertCustomer(user);
  const [active, history] = await Promise.all([
    orders.findManyForCustomer(user.id, ACTIVE_ORDER_STATUSES),
    orders.findManyForCustomer(user.id, PAST_ORDER_STATUSES),
  ]);
  return {
    activeOrders: active.map(toListView),
    orderHistory: history.map(toListView),
  };
}

export async function getCustomerOrderDetails(
  user: AuthenticatedUser,
  orderId: string,
  orders: CustomerOrderRepository = repository(),
) {
  assertCustomer(user);
  const order = await orders.findForCustomer(user.id, orderId);
  if (!order) {
    throw new CustomerOrderError("ORDER_NOT_FOUND", "Order not found.", 404);
  }
  return toDetailView(order);
}
