import { getDb } from "@/db";
import { OrderStatus, UserRole } from "@/generated/prisma/client";
import {
  assertOrderStatusTransition,
  OrderStateMachineError,
} from "@/features/orders/order-state-machine";
import {
  PrismaOrderStatusRepository,
  type OrderStatusRepository,
  type OrderTransitionRecord,
} from "@/repositories/order-status.repository";
import type { AuthenticatedUser } from "@/types/auth";
import {
  buildOrderNotifications,
  notificationTypeForOrderStatus,
} from "@/services/order-notification.service";

type OrderStatusServiceErrorCode =
  | "ORDER_NOT_FOUND"
  | "ORDER_ACCESS_DENIED"
  | "ORDER_CHANGED"
  | "INVALID_ORDER_TRANSITION"
  | "UNAUTHORIZED_ORDER_TRANSITION";

export class OrderStatusServiceError extends Error {
  constructor(
    readonly code: OrderStatusServiceErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OrderStatusServiceError";
  }
}

function getOrderStatusRepository(): OrderStatusRepository {
  return new PrismaOrderStatusRepository(getDb());
}

function actorCanAccessOrder(
  actor: AuthenticatedUser,
  order: OrderTransitionRecord,
): boolean {
  switch (actor.role) {
    case UserRole.ADMIN:
      return true;
    case UserRole.CUSTOMER:
      return order.customerId === actor.id;
    case UserRole.SHOP_OWNER:
      return order.shop.ownerId === actor.id;
    case UserRole.DELIVERY_PERSON:
      return order.batchAssignment?.batch.deliveryPersonId === actor.id;
  }
}

export async function transitionOrderStatus(
  actor: AuthenticatedUser,
  orderId: string,
  nextStatus: OrderStatus,
  note?: string,
  repository: OrderStatusRepository = getOrderStatusRepository(),
) {
  return repository.transaction(async (transaction) => {
    const order = await transaction.findOrder(orderId);
    if (!order) {
      throw new OrderStatusServiceError(
        "ORDER_NOT_FOUND",
        "Order not found.",
        404,
      );
    }
    if (!actorCanAccessOrder(actor, order)) {
      throw new OrderStatusServiceError(
        "ORDER_ACCESS_DENIED",
        "You cannot change this order.",
        403,
      );
    }

    try {
      assertOrderStatusTransition(order.status, nextStatus, actor.role);
    } catch (error) {
      if (error instanceof OrderStateMachineError) {
        throw new OrderStatusServiceError(
          error.code,
          error.message,
          error.code === "UNAUTHORIZED_ORDER_TRANSITION" ? 403 : 409,
        );
      }
      throw error;
    }

    const transitionAt = new Date();
    const normalizedNote = note?.trim() || null;
    const cancellation =
      nextStatus === OrderStatus.CANCELLED
        ? { at: transitionAt, reason: normalizedNote }
        : null;

    const updated = await transaction.updateStatus(
      order.id,
      order.status,
      nextStatus,
      cancellation,
    );
    if (!updated) {
      throw new OrderStatusServiceError(
        "ORDER_CHANGED",
        "The order status changed. Refresh and try again.",
        409,
      );
    }

    if (
      nextStatus === OrderStatus.CANCELLED ||
      nextStatus === OrderStatus.REJECTED
    ) {
      await transaction.restoreStock(order.items);
    }

    const history = await transaction.createHistory({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: nextStatus,
      changedById: actor.id,
      note: normalizedNote,
      createdAt: transitionAt,
    });

    const notificationType = notificationTypeForOrderStatus(nextStatus);
    if (notificationType) {
      const availableDeliveryPersonIds =
        nextStatus === OrderStatus.READY_FOR_DELIVERY
          ? await transaction.findActiveDeliveryPersonIds(order.shopId)
          : [];
      await transaction.createNotifications(
        buildOrderNotifications(notificationType, {
          orderId: order.id,
          customerId: order.customerId,
          shopOwnerId: order.shop.ownerId,
          availableDeliveryPersonIds,
          ...(order.batchAssignment
            ? {
                deliveryPersonId: order.batchAssignment.batch.deliveryPersonId,
              }
            : {}),
        }),
      );
    }

    return {
      orderId: order.id,
      previousStatus: order.status,
      status: nextStatus,
      changedAt: history.createdAt.toISOString(),
      ...(cancellation
        ? {
            cancelledAt: cancellation.at.toISOString(),
            cancellationReason: cancellation.reason,
          }
        : {}),
    };
  });
}
