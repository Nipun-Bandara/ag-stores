import { OrderStatus, UserRole } from "@/generated/prisma/client";

export const ORDER_STATUS_TRANSITIONS = {
  [OrderStatus.PLACED]: [
    OrderStatus.CONFIRMED,
    OrderStatus.REJECTED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING],
  [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_DELIVERY],
  [OrderStatus.READY_FOR_DELIVERY]: [OrderStatus.ASSIGNED],
  [OrderStatus.ASSIGNED]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [
    OrderStatus.DELIVERED,
    OrderStatus.FAILED_DELIVERY,
  ],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.FAILED_DELIVERY]: [],
} as const satisfies Record<OrderStatus, readonly OrderStatus[]>;

export const ORDER_TRANSITION_ROLES: Readonly<
  Partial<
    Record<OrderStatus, Partial<Record<OrderStatus, readonly UserRole[]>>>
  >
> = {
  [OrderStatus.PLACED]: {
    [OrderStatus.CONFIRMED]: [UserRole.SHOP_OWNER],
    [OrderStatus.REJECTED]: [UserRole.SHOP_OWNER],
    [OrderStatus.CANCELLED]: [UserRole.CUSTOMER],
  },
  [OrderStatus.CONFIRMED]: {
    [OrderStatus.PREPARING]: [UserRole.SHOP_OWNER],
  },
  [OrderStatus.PREPARING]: {
    [OrderStatus.READY_FOR_DELIVERY]: [UserRole.SHOP_OWNER],
  },
  [OrderStatus.READY_FOR_DELIVERY]: {
    [OrderStatus.ASSIGNED]: [UserRole.DELIVERY_PERSON],
  },
  [OrderStatus.ASSIGNED]: {
    [OrderStatus.OUT_FOR_DELIVERY]: [UserRole.DELIVERY_PERSON],
  },
  [OrderStatus.OUT_FOR_DELIVERY]: {
    [OrderStatus.DELIVERED]: [UserRole.DELIVERY_PERSON],
    [OrderStatus.FAILED_DELIVERY]: [UserRole.DELIVERY_PERSON],
  },
};

export type OrderStateMachineErrorCode =
  "INVALID_ORDER_TRANSITION" | "UNAUTHORIZED_ORDER_TRANSITION";

export class OrderStateMachineError extends Error {
  constructor(
    readonly code: OrderStateMachineErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OrderStateMachineError";
  }
}

export function getAllowedOrderTransitions(
  currentStatus: OrderStatus,
): readonly OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[currentStatus];
}

export function assertOrderStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
  actorRole: UserRole,
): void {
  const allowed = getAllowedOrderTransitions(currentStatus);
  if (!allowed.some((candidate) => candidate === nextStatus)) {
    throw new OrderStateMachineError(
      "INVALID_ORDER_TRANSITION",
      `Order cannot transition from ${currentStatus} to ${nextStatus}.`,
    );
  }

  const allowedRoles =
    ORDER_TRANSITION_ROLES[currentStatus]?.[nextStatus] ?? [];
  if (actorRole !== UserRole.ADMIN && !allowedRoles.includes(actorRole)) {
    throw new OrderStateMachineError(
      "UNAUTHORIZED_ORDER_TRANSITION",
      `${actorRole} cannot transition an order from ${currentStatus} to ${nextStatus}.`,
    );
  }
}
