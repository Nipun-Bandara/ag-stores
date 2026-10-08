import { getDb } from "@/db";
import {
  DeliveryBatchStatus,
  NotificationType,
  OrderStatus,
  UserRole,
} from "@/generated/prisma/client";
import {
  assertOrderStatusTransition,
  OrderStateMachineError,
} from "@/features/orders/order-state-machine";
import {
  PrismaDeliveryBatchManagementRepository,
  type DeliveryBatchDetailRecord,
  type DeliveryBatchManagementRepository,
} from "@/repositories/delivery-batch-management.repository";
import type { AuthenticatedUser } from "@/types/auth";
import { buildOrderNotifications } from "@/services/order-notification.service";
import type {
  CompleteDeliveryOrderInput,
  ReorderDeliveryBatchInput,
} from "@/validations/delivery-batch";

type DeliveryBatchManagementErrorCode =
  | "DELIVERY_ONLY"
  | "BATCH_NOT_FOUND"
  | "BATCH_ALREADY_STARTED"
  | "BATCH_NOT_IN_PROGRESS"
  | "INVALID_BATCH_SEQUENCE"
  | "ORDER_NOT_IN_BATCH"
  | "ORDER_CHANGED"
  | "INVALID_ORDER_TRANSITION";

export class DeliveryBatchManagementError extends Error {
  constructor(
    readonly code: DeliveryBatchManagementErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DeliveryBatchManagementError";
  }
}

function repository(): DeliveryBatchManagementRepository {
  return new PrismaDeliveryBatchManagementRepository(getDb());
}

function assertDeliveryPerson(user: AuthenticatedUser): void {
  if (user.role !== UserRole.DELIVERY_PERSON) {
    throw new DeliveryBatchManagementError(
      "DELIVERY_ONLY",
      "Delivery personnel access is required.",
      403,
    );
  }
}

function toDetailView(batch: DeliveryBatchDetailRecord) {
  const shop = batch.orders[0]?.order.shop;
  return {
    id: batch.id,
    status: batch.status,
    createdAt: batch.createdAt.toISOString(),
    startedAt: batch.startedAt?.toISOString() ?? null,
    completedAt: batch.completedAt?.toISOString() ?? null,
    shopLocation: shop
      ? {
          id: shop.id,
          name: shop.name,
          latitude: shop.latitude.toString(),
          longitude: shop.longitude.toString(),
        }
      : null,
    orders: batch.orders.map(({ sequence, order }) => ({
      id: order.id,
      sequence,
      status: order.status,
      total: order.total.toFixed(2),
      customerNote: order.customerNote,
      createdAt: order.createdAt.toISOString(),
      itemCount: order._count.items,
      deliveryLocation: {
        label: order.deliveryAddress.label,
        address: order.deliveryAddress.address,
        latitude: order.deliveryAddress.latitude.toString(),
        longitude: order.deliveryAddress.longitude.toString(),
      },
    })),
  };
}

function assertTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
  role: UserRole,
): void {
  try {
    assertOrderStatusTransition(currentStatus, nextStatus, role);
  } catch (error) {
    if (error instanceof OrderStateMachineError) {
      throw new DeliveryBatchManagementError(
        "INVALID_ORDER_TRANSITION",
        error.message,
        409,
      );
    }
    throw error;
  }
}

export async function listActiveDeliveryBatches(
  user: AuthenticatedUser,
  batches: DeliveryBatchManagementRepository = repository(),
) {
  assertDeliveryPerson(user);
  const records = await batches.findActive(user.id);
  return records.map((batch) => ({
    id: batch.id,
    status: batch.status,
    createdAt: batch.createdAt.toISOString(),
    startedAt: batch.startedAt?.toISOString() ?? null,
    orderCount: batch._count.orders,
    deliveredCount: batch.orders.filter(
      ({ order }) => order.status === OrderStatus.DELIVERED,
    ).length,
    failedCount: batch.orders.filter(
      ({ order }) => order.status === OrderStatus.FAILED_DELIVERY,
    ).length,
  }));
}

export async function getDeliveryBatch(
  user: AuthenticatedUser,
  batchId: string,
  batches: DeliveryBatchManagementRepository = repository(),
) {
  assertDeliveryPerson(user);
  const batch = await batches.findOwnedDetail(user.id, batchId);
  if (!batch) {
    throw new DeliveryBatchManagementError(
      "BATCH_NOT_FOUND",
      "Delivery batch not found.",
      404,
    );
  }
  return toDetailView(batch);
}

export async function reorderDeliveryBatch(
  user: AuthenticatedUser,
  batchId: string,
  input: ReorderDeliveryBatchInput,
  batches: DeliveryBatchManagementRepository = repository(),
) {
  assertDeliveryPerson(user);
  return batches.transaction(async (transaction) => {
    await transaction.lockBatch(batchId);
    const batch = await transaction.findOwnedBatch(user.id, batchId);
    if (!batch) {
      throw new DeliveryBatchManagementError(
        "BATCH_NOT_FOUND",
        "Delivery batch not found.",
        404,
      );
    }
    if (batch.status !== DeliveryBatchStatus.PENDING) {
      throw new DeliveryBatchManagementError(
        "BATCH_ALREADY_STARTED",
        "Delivery sequence can only be changed before the batch starts.",
        409,
      );
    }

    const currentIds = new Set(batch.orders.map(({ order }) => order.id));
    if (
      input.orderIds.length !== currentIds.size ||
      input.orderIds.some((orderId) => !currentIds.has(orderId))
    ) {
      throw new DeliveryBatchManagementError(
        "INVALID_BATCH_SEQUENCE",
        "The delivery sequence must contain every batch order exactly once.",
        400,
      );
    }
    await transaction.updateSequences(batch.id, input.orderIds);
    return {
      id: batch.id,
      orders: input.orderIds.map((orderId, index) => ({
        orderId,
        sequence: index + 1,
      })),
    };
  });
}

export async function startDeliveryBatch(
  user: AuthenticatedUser,
  batchId: string,
  batches: DeliveryBatchManagementRepository = repository(),
) {
  assertDeliveryPerson(user);
  return batches.transaction(async (transaction) => {
    await transaction.lockBatch(batchId);
    const batch = await transaction.findOwnedBatch(user.id, batchId);
    if (!batch) {
      throw new DeliveryBatchManagementError(
        "BATCH_NOT_FOUND",
        "Delivery batch not found.",
        404,
      );
    }
    if (batch.status !== DeliveryBatchStatus.PENDING) {
      throw new DeliveryBatchManagementError(
        "BATCH_ALREADY_STARTED",
        "This delivery batch has already started.",
        409,
      );
    }
    const orderIds = batch.orders.map(({ order }) => order.id);
    if (orderIds.length === 0) {
      throw new DeliveryBatchManagementError(
        "ORDER_CHANGED",
        "An empty delivery batch cannot be started.",
        409,
      );
    }
    await transaction.lockOrders(orderIds);
    for (const { order } of batch.orders) {
      assertTransition(order.status, OrderStatus.OUT_FOR_DELIVERY, user.role);
    }

    const startedAt = new Date();
    if (!(await transaction.startBatch(batch.id, startedAt))) {
      throw new DeliveryBatchManagementError(
        "ORDER_CHANGED",
        "The delivery batch changed. Refresh and try again.",
        409,
      );
    }
    if ((await transaction.startOrders(batch.id)) !== orderIds.length) {
      throw new DeliveryBatchManagementError(
        "ORDER_CHANGED",
        "One or more orders changed before the batch could start.",
        409,
      );
    }
    await transaction.createStartHistory({
      orderIds,
      changedById: user.id,
      createdAt: startedAt,
    });
    await transaction.createNotifications(
      batch.orders.flatMap(({ order }) =>
        buildOrderNotifications(NotificationType.ORDER_OUT_FOR_DELIVERY, {
          orderId: order.id,
          customerId: order.customerId,
        }),
      ),
    );
    return {
      id: batch.id,
      status: DeliveryBatchStatus.IN_PROGRESS,
      startedAt: startedAt.toISOString(),
      orderIds,
    };
  });
}

export async function completeDeliveryOrder(
  user: AuthenticatedUser,
  batchId: string,
  orderId: string,
  input: CompleteDeliveryOrderInput,
  batches: DeliveryBatchManagementRepository = repository(),
) {
  assertDeliveryPerson(user);
  return batches.transaction(async (transaction) => {
    await transaction.lockBatch(batchId);
    const batch = await transaction.findOwnedBatch(user.id, batchId);
    if (!batch) {
      throw new DeliveryBatchManagementError(
        "BATCH_NOT_FOUND",
        "Delivery batch not found.",
        404,
      );
    }
    if (batch.status !== DeliveryBatchStatus.IN_PROGRESS) {
      throw new DeliveryBatchManagementError(
        "BATCH_NOT_IN_PROGRESS",
        "The delivery batch must be in progress.",
        409,
      );
    }
    const assignment = batch.orders.find(({ order }) => order.id === orderId);
    if (!assignment) {
      throw new DeliveryBatchManagementError(
        "ORDER_NOT_IN_BATCH",
        "Order not found in this delivery batch.",
        404,
      );
    }
    await transaction.lockOrders([orderId]);
    assertTransition(assignment.order.status, input.status, user.role);

    const changedAt = new Date();
    const updated = await transaction.updateOrderStatus({
      batchId,
      orderId,
      expectedStatus: assignment.order.status,
      nextStatus: input.status,
    });
    if (!updated) {
      throw new DeliveryBatchManagementError(
        "ORDER_CHANGED",
        "The order changed. Refresh and try again.",
        409,
      );
    }
    await transaction.createOrderHistory({
      orderId,
      fromStatus: assignment.order.status,
      toStatus: input.status,
      changedById: user.id,
      note: input.note?.trim() || null,
      createdAt: changedAt,
    });
    if (input.status === OrderStatus.DELIVERED) {
      await transaction.createNotifications(
        buildOrderNotifications(NotificationType.ORDER_DELIVERED, {
          orderId,
          customerId: assignment.order.customerId,
        }),
      );
    }

    const batchCompleted =
      (await transaction.countUnfinishedOrders(batchId)) === 0;
    if (
      batchCompleted &&
      !(await transaction.completeBatch(batchId, changedAt))
    ) {
      throw new DeliveryBatchManagementError(
        "ORDER_CHANGED",
        "The delivery batch changed. Refresh and try again.",
        409,
      );
    }
    return {
      batchId,
      orderId,
      status: input.status,
      changedAt: changedAt.toISOString(),
      batchCompleted,
      batchStatus: batchCompleted
        ? DeliveryBatchStatus.COMPLETED
        : DeliveryBatchStatus.IN_PROGRESS,
    };
  });
}
