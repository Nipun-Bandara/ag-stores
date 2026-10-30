// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import type { AdminDashboardSnapshot } from "@/repositories/admin-dashboard.repository";
import { getAdminDashboard } from "@/services/admin-dashboard.service";
import type { AuthenticatedUser } from "@/types/auth";

const administrator: AuthenticatedUser = {
  id: "admin-id",
  name: "Admin",
  email: null,
  phone: null,
  role: "ADMIN",
  preferredLanguage: "EN",
  status: "ACTIVE",
};

const snapshot: AdminDashboardSnapshot = {
  ordersToday: 4,
  deliveredToday: 2,
  salesToday: "1250.00",
  unassignedRiders: 1,
  users: [
    { role: "CUSTOMER", status: "ACTIVE", count: 10 },
    { role: "CUSTOMER", status: "SUSPENDED", count: 2 },
    { role: "DELIVERY_PERSON", status: "INACTIVE", count: 1 },
    { role: "ADMIN", status: "ACTIVE", count: 1 },
  ],
  shops: [
    { isActive: true, isOpen: true, count: 3 },
    { isActive: true, isOpen: false, count: 2 },
    { isActive: false, isOpen: true, count: 1 },
  ],
  orders: [
    { status: "PLACED", count: 3 },
    { status: "CONFIRMED", count: 2 },
    { status: "PREPARING", count: 1 },
    { status: "OUT_FOR_DELIVERY", count: 4 },
    { status: "CANCELLED", count: 20 },
    { status: "DELIVERED", count: 100 },
  ],
  dailyOrders: [
    { date: "2026-10-29", orders: 7 },
    { date: "2026-10-30", orders: 4 },
  ],
};

describe("administration dashboard", () => {
  it("uses Colombo day boundaries and fills dates without orders", async () => {
    const repository = { snapshot: vi.fn().mockResolvedValue(snapshot) };
    const dashboard = await getAdminDashboard(
      administrator,
      repository,
      new Date("2026-10-29T19:00:00Z"),
    );

    expect(repository.snapshot).toHaveBeenCalledWith(
      new Date("2026-10-29T18:30:00Z"),
      new Date("2026-10-30T18:30:00Z"),
      new Date("2026-10-23T18:30:00Z"),
    );
    expect(dashboard.dailyOrders).toHaveLength(7);
    expect(dashboard.dailyOrders[0]).toEqual({ date: "2026-10-24", orders: 0 });
    expect(dashboard.dailyOrders[6]).toEqual({ date: "2026-10-30", orders: 4 });
    expect(dashboard.weekOrders).toBe(11);
    expect(dashboard.totalUsers).toBe(14);
    expect(dashboard.restrictedUsers).toBe(3);
    expect(dashboard.openShops).toBe(3);
    expect(dashboard.totalShops).toBe(6);
    expect(dashboard.inactiveShops).toBe(1);
    expect(dashboard.activeOrders).toBe(10);
    expect(
      dashboard.pipeline.find(
        (stage) => stage.label === "Confirmed and preparing",
      )?.count,
    ).toBe(3);
  });

  it("rejects non-administrators before loading platform data", async () => {
    const repository = { snapshot: vi.fn() };
    await expect(
      getAdminDashboard({ ...administrator, role: "CUSTOMER" }, repository),
    ).rejects.toThrow("Administrator access is required.");
    expect(repository.snapshot).not.toHaveBeenCalled();
  });
});
