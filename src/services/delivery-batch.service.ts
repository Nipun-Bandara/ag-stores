import { getDb } from "@/db";
import { OrderStatus, UserRole } from "@/generated/prisma/client";
import { assertOrderStatusTransition } from "@/features/orders/order-state-machine";
import {
  isDeliveryBatchConflictError,
  PrismaDeliveryBatchRepository,
  type DeliveryBatchRepository,
} from "@/repositories/delivery-batch.repository";
import type { AuthenticatedUser } from "@/types/auth";
import type { CreateDeliveryBatchInput } from "@/validations/delivery-batch";

type DeliveryBatchErrorCode =
  | "DELIVERY_ONLY"
  | "SHOP_ASSIGNMENT_REQUIRED"
  | "ORDER_NOT_FOUND"
  | "ORDER_WRONG_SHOP"
  | "ORDER_ALREADY_ASSIGNED"
  | "ORDER_NOT_READY"
  | "BATCH_CONFLICT";

export class DeliveryBatchError extends Error {
  constructor(
    readonly code: DeliveryBatchErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DeliveryBatchError";
  }
}

function repository(): DeliveryBatchRepository {
  return new PrismaDeliveryBatchRepository(getDb());
}

export async function createDeliveryBatch(
  user: AuthenticatedUser,
  input: CreateDeliveryBatchInput,
  batches: DeliveryBatchRepository = repository(),
) {
  if (user.role !== UserRole.DELIVERY_PERSON) {
    throw new DeliveryBatchError(
      "DELIVERY_ONLY",
      "Delivery personnel access is required.",
      403,
    );
  }

  try {
    return await batches.transaction(async (transaction) => {
      const shopId = await transaction.findAssignedShopId(user.id);
      if (!shopId) {
        throw new DeliveryBatchError(
          "SHOP_ASSIGNMENT_REQUIRED",
          "A shop assignment is required to create a delivery batch.",
          409,
        );
      }

      await transaction.lockOrders(input.orderIds);
      const orders = await transaction.findOrders(input.orderIds);
      if (orders.length !== input.orderIds.length) {
        throw new DeliveryBatchError(
          "ORDER_NOT_FOUND",
          "One or more selected orders were not found.",
          404,
        );
      }

      const byId = new Map(orders.map((order) => [order.id, order]));
      for (const orderId of input.orderIds) {
        const order = byId.get(orderId);
        if (!order) {
          throw new DeliveryBatchError(
            "ORDER_NOT_FOUND",
            "One or more selected orders were not found.",
            404,
          );
        }
        if (order.shopId !== shopId) {
          throw new DeliveryBatchError(
            "ORDER_WRONG_SHOP",
            "One or more selected orders do not belong to your assigned shop.",
            403,
          );
        }
        if (order.batchAssignment) {
          throw new DeliveryBatchError(
            "ORDER_ALREADY_ASSIGNED",
            "One or more selected orders have already been assigned.",
            409,
          );
        }
        if (order.status !== OrderStatus.READY_FOR_DELIVERY) {
          throw new DeliveryBatchError(
            "ORDER_NOT_READY",
            "One or more selected orders are not ready for delivery.",
            409,
          );
        }
        assertOrderStatusTransition(
          order.status,
          OrderStatus.ASSIGNED,
          user.role,
        );
      }

      const batch = await transaction.createBatch(user.id);
      const updatedCount = await transaction.updateOrdersToAssigned(
        input.orderIds,
      );
      if (updatedCount !== input.orderIds.length) {
        throw new DeliveryBatchError(
          "BATCH_CONFLICT",
          "One or more selected orders changed before they could be assigned.",
          409,
        );
      }
      await transaction.createAssignments(batch.id, input.orderIds);
      await transaction.createStatusHistory({
        orderIds: input.orderIds,
        changedById: user.id,
        createdAt: batch.createdAt,
        note: `Assigned to delivery batch ${batch.id}.`,
      });

      return {
        id: batch.id,
        deliveryPersonId: batch.deliveryPersonId,
        status: batch.status,
        createdAt: batch.createdAt.toISOString(),
        orders: input.orderIds.map((orderId, index) => ({
          orderId,
          sequence: index + 1,
        })),
      };
    });
  } catch (error) {
    if (error instanceof DeliveryBatchError) throw error;
    if (isDeliveryBatchConflictError(error)) {
      throw new DeliveryBatchError(
        "BATCH_CONFLICT",
        "One or more selected orders were assigned by another delivery person.",
        409,
      );
    }
    throw error;
  }
}
