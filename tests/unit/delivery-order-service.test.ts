import { describe, expect, it } from "vitest";

import {
  PreferredLanguage,
  Prisma,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import type {
  AvailableDeliveryOrderRecord,
  DeliveryOrderRepository,
} from "@/repositories/delivery-order.repository";
import {
  listAvailableDeliveryOrders,
  toGeneralDeliveryArea,
} from "@/services/delivery-order.service";
import type { AuthenticatedUser } from "@/types/auth";

const deliveryUser: AuthenticatedUser = {
  id: "eea0040f-8bdf-4be6-b104-b23fb876a994",
  name: "Distance Sorter",
  email: "sorter@example.test",
  phone: null,
  role: UserRole.DELIVERY_PERSON,
  preferredLanguage: PreferredLanguage.EN,
  status: UserStatus.ACTIVE,
};

function order(
  id: string,
  latitude: string,
  longitude: string,
): AvailableDeliveryOrderRecord {
  return {
    id,
    total: new Prisma.Decimal("250.00"),
    createdAt: new Date("2026-10-05T08:00:00.000Z"),
    deliveryAddress: {
      address: "Test Area, Colombo",
      latitude: new Prisma.Decimal(latitude),
      longitude: new Prisma.Decimal(longitude),
    },
    _count: { items: 1 },
  };
}

function distanceRepository(): DeliveryOrderRepository {
  return {
    findAssignedShop: async () => ({
      id: "a209581d-e13e-4fe7-8cb7-0fb5fe189dea",
      name: "Distance Shop",
      latitude: new Prisma.Decimal("6.906944"),
      longitude: new Prisma.Decimal("79.850000"),
    }),
    findAvailableOrders: async () => [
      order("00000000-0000-4000-8000-000000000003", "7.000000", "80.000000"),
      order("00000000-0000-4000-8000-000000000001", "6.910000", "79.855000"),
      order("00000000-0000-4000-8000-000000000002", "6.927079", "79.861244"),
    ],
  };
}

describe("delivery order presentation helpers", () => {
  it("reduces a full address to a general area", () => {
    expect(toGeneralDeliveryArea("42 Secret Lane, Colombo 05, Colombo")).toBe(
      "Colombo 05, Colombo",
    );
    expect(toGeneralDeliveryArea("42 Secret Lane")).toBe("Area unavailable");
  });

  it("sorts available orders by unrounded geographic distance", async () => {
    const repository = distanceRepository();
    const ascending = await listAvailableDeliveryOrders(
      deliveryUser,
      { sortBy: "distance", direction: "asc" },
      repository,
    );
    const descending = await listAvailableDeliveryOrders(
      deliveryUser,
      { sortBy: "distance", direction: "desc" },
      repository,
    );

    expect(ascending.orders.map(({ id }) => id)).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000003",
    ]);
    expect(descending.orders.map(({ id }) => id)).toEqual(
      [...ascending.orders].reverse().map(({ id }) => id),
    );
  });
});
