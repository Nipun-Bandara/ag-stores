import { describe, expect, it, vi } from "vitest";

import {
  OrderStatus,
  PreferredLanguage,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import type { OwnerDashboardRepository } from "@/repositories/owner-dashboard.repository";
import {
  getColomboDayRange,
  getOwnerDashboard,
  OwnerDashboardError,
} from "@/services/owner-dashboard.service";
import type { AuthenticatedUser } from "@/types/auth";

const owner: AuthenticatedUser = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Owner",
  email: "owner@example.test",
  phone: null,
  role: UserRole.SHOP_OWNER,
  preferredLanguage: PreferredLanguage.EN,
  status: UserStatus.ACTIVE,
};

describe("owner dashboard service", () => {
  it("maps server aggregates into the requested owner metrics", async () => {
    const aggregateOwned = vi.fn().mockResolvedValue({
      ordersToday: 7,
      statusCounts: [
        { status: OrderStatus.PLACED, count: 2 },
        { status: OrderStatus.CONFIRMED, count: 3 },
        { status: OrderStatus.PREPARING, count: 4 },
        { status: OrderStatus.READY_FOR_DELIVERY, count: 5 },
        { status: OrderStatus.OUT_FOR_DELIVERY, count: 6 },
      ],
      deliveredToday: 8,
      revenueToday: "1250.50",
      lowStockProducts: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          nameEn: "Tea",
          nameSi: "තේ",
          stockQuantity: 2,
          lowStockThreshold: 5,
          shopName: "Owner Shop",
        },
      ],
    });
    const repository: OwnerDashboardRepository = { aggregateOwned };
    const now = new Date("2026-10-07T20:00:00.000Z");

    await expect(getOwnerDashboard(owner, repository, now)).resolves.toEqual({
      ordersToday: 7,
      pendingOrders: 5,
      preparingOrders: 4,
      readyForDelivery: 5,
      outForDelivery: 6,
      deliveredToday: 8,
      revenueToday: "1250.50",
      lowStockProducts: expect.arrayContaining([
        expect.objectContaining({ nameEn: "Tea" }),
      ]),
    });
    expect(aggregateOwned).toHaveBeenCalledWith(
      owner.id,
      new Date("2026-10-07T18:30:00.000Z"),
      new Date("2026-10-08T18:30:00.000Z"),
    );
  });

  it("calculates Colombo calendar-day boundaries", () => {
    expect(getColomboDayRange(new Date("2026-10-07T18:29:59.999Z"))).toEqual({
      start: new Date("2026-10-06T18:30:00.000Z"),
      end: new Date("2026-10-07T18:30:00.000Z"),
    });
  });

  it("rejects non-owners before querying metrics", async () => {
    const repository: OwnerDashboardRepository = {
      aggregateOwned: vi.fn(),
    };

    await expect(
      getOwnerDashboard({ ...owner, role: UserRole.CUSTOMER }, repository),
    ).rejects.toBeInstanceOf(OwnerDashboardError);
    expect(repository.aggregateOwned).not.toHaveBeenCalled();
  });
});
