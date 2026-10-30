import { describe, expect, it, vi } from "vitest";

import {
  OrderStatus,
  PreferredLanguage,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import type { OwnerReportRepository } from "@/repositories/owner-report.repository";
import {
  getOwnerReports,
  OwnerReportError,
} from "@/services/owner-report.service";
import type { AuthenticatedUser } from "@/types/auth";
import { ownerReportFiltersSchema } from "@/validations/owner-report";

const owner: AuthenticatedUser = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Owner",
  email: "owner@example.test",
  phone: null,
  role: UserRole.SHOP_OWNER,
  preferredLanguage: PreferredLanguage.EN,
  status: UserStatus.ACTIVE,
};

function repository(): OwnerReportRepository {
  return {
    aggregateOwned: vi.fn().mockResolvedValue({
      dailyOrders: [
        { date: "2026-10-01", orders: 2 },
        { date: "2026-10-02", orders: 1 },
      ],
      dailyRevenue: [
        { date: "2026-10-01", revenue: "100.50" },
        { date: "2026-10-02", revenue: "200.25" },
      ],
      ordersByStatus: [{ status: OrderStatus.DELIVERED, orders: 2 }],
      bestSellingProducts: [],
      lowStockProducts: [],
      completedDeliveries: 2,
      failedDeliveries: 1,
    }),
  };
}

describe("owner reporting service", () => {
  it("calculates totals and passes an inclusive Colombo date range", async () => {
    const reports = repository();
    const result = await getOwnerReports(
      owner,
      { from: "2026-10-01", to: "2026-10-03" },
      reports,
    );

    expect(reports.aggregateOwned).toHaveBeenCalledWith(owner.id, {
      from: new Date("2026-09-30T18:30:00.000Z"),
      toExclusive: new Date("2026-10-03T18:30:00.000Z"),
    });
    expect(result.summary).toEqual({
      totalOrders: 3,
      totalRevenue: "300.75",
      completedDeliveries: 2,
      failedDeliveries: 1,
    });
  });

  it("handles empty report datasets", async () => {
    const reports: OwnerReportRepository = {
      aggregateOwned: vi.fn().mockResolvedValue({
        dailyOrders: [],
        dailyRevenue: [],
        ordersByStatus: [],
        bestSellingProducts: [],
        lowStockProducts: [],
        completedDeliveries: 0,
        failedDeliveries: 0,
      }),
    };

    await expect(
      getOwnerReports(owner, { from: "2026-10-01", to: "2026-10-01" }, reports),
    ).resolves.toMatchObject({
      summary: {
        totalOrders: 0,
        totalRevenue: "0.00",
        completedDeliveries: 0,
        failedDeliveries: 0,
      },
      dailyOrders: [],
      bestSellingProducts: [],
    });
  });

  it("rejects non-owners before querying reports", async () => {
    const reports = repository();
    await expect(
      getOwnerReports({ ...owner, role: UserRole.CUSTOMER }, {}, reports),
    ).rejects.toBeInstanceOf(OwnerReportError);
    expect(reports.aggregateOwned).not.toHaveBeenCalled();
  });

  it("validates complete, ordered, bounded date ranges", () => {
    expect(
      ownerReportFiltersSchema.safeParse({ from: "2026-10-01" }).success,
    ).toBe(false);
    expect(
      ownerReportFiltersSchema.safeParse({
        from: "2026-10-03",
        to: "2026-10-01",
      }).success,
    ).toBe(false);
    expect(
      ownerReportFiltersSchema.safeParse({
        from: "2025-01-01",
        to: "2026-10-01",
      }).success,
    ).toBe(false);
    expect(
      ownerReportFiltersSchema.safeParse({
        from: "2026-10-01",
        to: "2026-10-03",
        status: OrderStatus.DELIVERED,
      }).success,
    ).toBe(true);
  });
});
