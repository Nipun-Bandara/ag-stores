import { describe, expect, it } from "vitest";

import { NotificationType, OrderStatus } from "@/generated/prisma/client";
import {
  buildOrderNotifications,
  notificationTypeForOrderStatus,
} from "@/services/order-notification.service";

const context = {
  orderId: "87d9a0e2-8e03-4c30-8377-fb41062017f2",
  customerId: "9965b2c6-6da9-49fd-9b52-655158116faf",
  shopOwnerId: "4a59ce72-4c66-4880-8aeb-7dfaa7e2975f",
  deliveryPersonId: "d1ccb444-7fca-4940-8429-3ba6d81967ca",
  availableDeliveryPersonIds: [
    "d1ccb444-7fca-4940-8429-3ba6d81967ca",
    "57abdb8e-55d5-4aae-826a-e4dc1a70ceab",
  ],
};

describe("order notification builder", () => {
  it.each([
    [OrderStatus.CONFIRMED, NotificationType.ORDER_CONFIRMED],
    [OrderStatus.READY_FOR_DELIVERY, NotificationType.ORDER_READY_FOR_DELIVERY],
    [OrderStatus.ASSIGNED, NotificationType.ORDER_ASSIGNED],
    [OrderStatus.OUT_FOR_DELIVERY, NotificationType.ORDER_OUT_FOR_DELIVERY],
    [OrderStatus.DELIVERED, NotificationType.ORDER_DELIVERED],
    [OrderStatus.REJECTED, NotificationType.ORDER_REJECTED],
    [OrderStatus.CANCELLED, NotificationType.ORDER_CANCELLED],
  ])("maps %s to %s", (status, type) => {
    expect(notificationTypeForOrderStatus(status)).toBe(type);
  });

  it.each([
    OrderStatus.PLACED,
    OrderStatus.PREPARING,
    OrderStatus.FAILED_DELIVERY,
  ])("does not create a status-transition notification for %s", (status) => {
    expect(notificationTypeForOrderStatus(status)).toBeNull();
  });

  it("targets only the customer and owner when an order is placed", () => {
    const notifications = buildOrderNotifications(
      NotificationType.ORDER_PLACED,
      context,
    );
    expect(notifications.map(({ userId }) => userId)).toEqual([
      context.customerId,
      context.shopOwnerId,
    ]);
  });

  it("targets the customer and only active same-shop delivery candidates when ready", () => {
    const notifications = buildOrderNotifications(
      NotificationType.ORDER_READY_FOR_DELIVERY,
      context,
    );
    expect(notifications.map(({ userId }) => userId)).toEqual([
      context.customerId,
      ...context.availableDeliveryPersonIds,
    ]);
  });

  it("targets the customer and assigned rider on assignment", () => {
    const notifications = buildOrderNotifications(
      NotificationType.ORDER_ASSIGNED,
      context,
    );
    expect(notifications.map(({ userId }) => userId)).toEqual([
      context.customerId,
      context.deliveryPersonId,
    ]);
  });
});
