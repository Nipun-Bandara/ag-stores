import { NotificationType, OrderStatus } from "@/generated/prisma/client";

export interface NotificationCreateRecord {
  userId: string;
  orderId: string;
  type: NotificationType;
  title: string;
  message: string;
}

interface OrderNotificationContext {
  orderId: string;
  customerId: string;
  shopOwnerId?: string;
  deliveryPersonId?: string;
  availableDeliveryPersonIds?: readonly string[];
}

function orderReference(orderId: string) {
  return orderId.slice(0, 8).toUpperCase();
}

function record(
  userId: string,
  orderId: string,
  type: NotificationType,
  title: string,
  message: string,
): NotificationCreateRecord {
  return { userId, orderId, type, title, message };
}

export function notificationTypeForOrderStatus(
  status: OrderStatus,
): NotificationType | null {
  const types: Partial<Record<OrderStatus, NotificationType>> = {
    [OrderStatus.CONFIRMED]: NotificationType.ORDER_CONFIRMED,
    [OrderStatus.READY_FOR_DELIVERY]: NotificationType.ORDER_READY_FOR_DELIVERY,
    [OrderStatus.ASSIGNED]: NotificationType.ORDER_ASSIGNED,
    [OrderStatus.OUT_FOR_DELIVERY]: NotificationType.ORDER_OUT_FOR_DELIVERY,
    [OrderStatus.DELIVERED]: NotificationType.ORDER_DELIVERED,
    [OrderStatus.REJECTED]: NotificationType.ORDER_REJECTED,
    [OrderStatus.CANCELLED]: NotificationType.ORDER_CANCELLED,
  };
  return types[status] ?? null;
}

export function buildOrderNotifications(
  type: NotificationType,
  context: OrderNotificationContext,
): NotificationCreateRecord[] {
  const reference = orderReference(context.orderId);
  const notifications: NotificationCreateRecord[] = [];

  switch (type) {
    case NotificationType.ORDER_PLACED:
      notifications.push(
        record(
          context.customerId,
          context.orderId,
          type,
          "Order placed",
          `Your order ${reference} has been placed.`,
        ),
      );
      if (context.shopOwnerId) {
        notifications.push(
          record(
            context.shopOwnerId,
            context.orderId,
            type,
            "New order received",
            `Order ${reference} is waiting for confirmation.`,
          ),
        );
      }
      break;
    case NotificationType.ORDER_CONFIRMED:
      notifications.push(
        record(
          context.customerId,
          context.orderId,
          type,
          "Order confirmed",
          `Your order ${reference} has been confirmed.`,
        ),
      );
      break;
    case NotificationType.ORDER_READY_FOR_DELIVERY:
      notifications.push(
        record(
          context.customerId,
          context.orderId,
          type,
          "Order ready for delivery",
          `Your order ${reference} is ready for delivery.`,
        ),
        ...(context.availableDeliveryPersonIds ?? []).map((userId) =>
          record(
            userId,
            context.orderId,
            type,
            "Order ready to claim",
            `Order ${reference} is ready at your assigned shop.`,
          ),
        ),
      );
      break;
    case NotificationType.ORDER_ASSIGNED:
      notifications.push(
        record(
          context.customerId,
          context.orderId,
          type,
          "Delivery assigned",
          `A delivery person has been assigned to order ${reference}.`,
        ),
      );
      if (context.deliveryPersonId) {
        notifications.push(
          record(
            context.deliveryPersonId,
            context.orderId,
            type,
            "Delivery assigned",
            `Order ${reference} was added to your delivery batch.`,
          ),
        );
      }
      break;
    case NotificationType.ORDER_OUT_FOR_DELIVERY:
      notifications.push(
        record(
          context.customerId,
          context.orderId,
          type,
          "Out for delivery",
          `Your order ${reference} is on its way.`,
        ),
      );
      break;
    case NotificationType.ORDER_DELIVERED:
      notifications.push(
        record(
          context.customerId,
          context.orderId,
          type,
          "Order delivered",
          `Your order ${reference} has been delivered.`,
        ),
      );
      break;
    case NotificationType.ORDER_REJECTED:
      notifications.push(
        record(
          context.customerId,
          context.orderId,
          type,
          "Order rejected",
          `Order ${reference} could not be accepted by the shop.`,
        ),
      );
      break;
    case NotificationType.ORDER_CANCELLED:
      notifications.push(
        record(
          context.customerId,
          context.orderId,
          type,
          "Order cancelled",
          `Order ${reference} has been cancelled.`,
        ),
      );
      if (context.shopOwnerId) {
        notifications.push(
          record(
            context.shopOwnerId,
            context.orderId,
            type,
            "Order cancelled",
            `Customer order ${reference} has been cancelled.`,
          ),
        );
      }
      break;
  }

  return [
    ...new Map(notifications.map((item) => [item.userId, item])).values(),
  ];
}
