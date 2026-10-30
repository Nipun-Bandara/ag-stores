import { describe, expect, it } from "vitest";

import {
  ORDER_STATUS_TRANSITIONS,
  ORDER_TRANSITION_ROLES,
  assertOrderStatusTransition,
  getAllowedOrderTransitions,
  OrderStateMachineError,
} from "@/features/orders/order-state-machine";
import { OrderStatus, UserRole } from "@/generated/prisma/client";

const validTransitions = [
  [OrderStatus.PLACED, OrderStatus.CONFIRMED],
  [OrderStatus.PLACED, OrderStatus.REJECTED],
  [OrderStatus.PLACED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED, OrderStatus.PREPARING],
  [OrderStatus.PREPARING, OrderStatus.READY_FOR_DELIVERY],
  [OrderStatus.READY_FOR_DELIVERY, OrderStatus.ASSIGNED],
  [OrderStatus.ASSIGNED, OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED],
  [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.FAILED_DELIVERY],
] as const;

const allStatuses = Object.values(OrderStatus);
const allRoles = Object.values(UserRole);

describe("order state machine", () => {
  it.each(validTransitions)(
    "permits %s -> %s for an explicitly authorized role",
    (currentStatus, nextStatus) => {
      const role =
        ORDER_TRANSITION_ROLES[currentStatus]?.[nextStatus]?.[0] ??
        UserRole.ADMIN;

      expect(() =>
        assertOrderStatusTransition(currentStatus, nextStatus, role),
      ).not.toThrow();
      expect(getAllowedOrderTransitions(currentStatus)).toContain(nextStatus);
    },
  );

  it("allows administrators to perform every valid transition", () => {
    for (const [currentStatus, nextStatus] of validTransitions) {
      expect(() =>
        assertOrderStatusTransition(currentStatus, nextStatus, UserRole.ADMIN),
      ).not.toThrow();
    }
  });

  it("rejects every transition not present in the explicit graph", () => {
    for (const currentStatus of allStatuses) {
      for (const nextStatus of allStatuses) {
        const isAllowed = ORDER_STATUS_TRANSITIONS[currentStatus].some(
          (candidate) => candidate === nextStatus,
        );
        if (isAllowed) continue;

        expect(() =>
          assertOrderStatusTransition(
            currentStatus,
            nextStatus,
            UserRole.ADMIN,
          ),
        ).toThrowError(
          expect.objectContaining<Partial<OrderStateMachineError>>({
            code: "INVALID_ORDER_TRANSITION",
          }),
        );
      }
    }
  });

  it.each(validTransitions)(
    "rejects an unauthorized role for %s -> %s",
    (currentStatus, nextStatus) => {
      const allowedRoles =
        ORDER_TRANSITION_ROLES[currentStatus]?.[nextStatus] ?? [];
      const unauthorizedRole = allRoles.find(
        (role) => role !== UserRole.ADMIN && !allowedRoles.includes(role),
      );
      expect(unauthorizedRole).toBeDefined();

      expect(() =>
        assertOrderStatusTransition(
          currentStatus,
          nextStatus,
          unauthorizedRole ?? UserRole.ADMIN,
        ),
      ).toThrowError(
        expect.objectContaining<Partial<OrderStateMachineError>>({
          code: "UNAUTHORIZED_ORDER_TRANSITION",
        }),
      );
    },
  );

  it("prevents a delivered order from returning to preparing", () => {
    expect(() =>
      assertOrderStatusTransition(
        OrderStatus.DELIVERED,
        OrderStatus.PREPARING,
        UserRole.ADMIN,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_ORDER_TRANSITION" }),
    );
  });

  it("prevents a cancelled order from being assigned", () => {
    expect(() =>
      assertOrderStatusTransition(
        OrderStatus.CANCELLED,
        OrderStatus.ASSIGNED,
        UserRole.ADMIN,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "INVALID_ORDER_TRANSITION" }),
    );
  });

  it("keeps all terminal states terminal", () => {
    for (const status of [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.REJECTED,
      OrderStatus.FAILED_DELIVERY,
    ]) {
      expect(getAllowedOrderTransitions(status)).toEqual([]);
    }
  });
});
