// @vitest-environment node
import { it, expect, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import type { AuthenticatedUser } from "@/types/auth";
import {
  getOrderStaff,
  saveOrderStaff,
  setOrderStaffStatus,
} from "@/services/order-staff.service";
import {
  canAccessWorkspace,
  DASHBOARD_BY_ROLE,
  getNavItemsForRole,
} from "@/lib/navigation";
import { orderStaffSchema } from "@/validations/order-staff";
import { getOwnerOrderDashboard } from "@/services/owner-order.service";
import type { OwnerOrderRepository } from "@/repositories/owner-order.repository";
vi.mock("@/lib/auth/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-secret"),
}));
const owner = { id: "owner", role: "SHOP_OWNER" } as AuthenticatedUser;
const staff = {
  id: "staff",
  role: "ORDER_STAFF",
  assignedShopId: "00000000-0000-4000-8000-000000000001",
} as AuthenticatedUser;
const input = {
  firstName: "Order",
  lastName: "Handler",
  phone: "0771234567",
  email: null,
};
function database() {
  const tx = {
    shop: {
      findMany: vi.fn().mockResolvedValue([{ id: staff.assignedShopId }]),
    },
    user: {
      findFirst: vi.fn().mockResolvedValue({ id: "staff" }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "new", phone: "+94771234567" }),
      update: vi.fn().mockResolvedValue({ id: "staff" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    authSession: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    auditLog: { create: vi.fn().mockResolvedValue({ id: "audit" }) },
  };
  return {
    tx,
    db: {
      ...tx,
      $transaction: vi.fn(async (operation) => operation(tx)),
    } as unknown as PrismaClient,
  };
}
it("keeps staff inside their own workspace with no product, stock, settings, or account management links", () => {
  expect(DASHBOARD_BY_ROLE.ORDER_STAFF).toBe("/staff/orders");
  const links = getNavItemsForRole("ORDER_STAFF").map((item) => item.href);
  expect(links).toContain("/staff/orders");
  expect(links).toContain("/staff/returns");
  for (const path of [
    "/owner/products",
    "/owner/stocks",
    "/owner/settings",
    "/owner/staff",
    "/admin/users",
  ]) {
    expect(links).not.toContain(path);
    expect(canAccessWorkspace("ORDER_STAFF", path)).toBe(false);
  }
  expect(canAccessWorkspace("ORDER_STAFF", "/profile")).toBe(true);
});
it("denies staff management to staff and rejects injected role changes", async () => {
  const { db } = database();
  await expect(getOrderStaff(staff, db)).rejects.toMatchObject({ status: 403 });
  await expect(
    saveOrderStaff(staff, input, undefined, db),
  ).rejects.toMatchObject({ status: 403 });
  expect(orderStaffSchema.safeParse({ ...input, role: "ADMIN" }).success).toBe(
    false,
  );
  expect(db.$transaction).not.toHaveBeenCalled();
});
it("assigns the only owned shop automatically and creates a fixed staff role with a hashed password", async () => {
  const { db, tx } = database();
  const result = await saveOrderStaff(owner, input, undefined, db);
  expect(tx.shop.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { ownerId: owner.id } }),
  );
  expect(tx.user.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        assignedShopId: staff.assignedShopId,
        role: "ORDER_STAFF",
        passwordHash: "hashed-secret",
        phone: "+94771234567",
      }),
    }),
  );
  expect(result.temporaryPassword).toMatch(/[A-Z]/);
  expect(result.temporaryPassword).toMatch(/[a-z]/);
  expect(result.temporaryPassword).toMatch(/\d/);
  expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain(
    result.temporaryPassword,
  );
});
it("rejects assigning an account to someone else's shop", async () => {
  const { db, tx } = database();
  await expect(
    saveOrderStaff(
      owner,
      { ...input, assignedShopId: "00000000-0000-4000-8000-000000000099" },
      undefined,
      db,
    ),
  ).rejects.toMatchObject({ status: 403 });
  expect(tx.user.create).not.toHaveBeenCalled();
});
it("restricts staff status updates to managed staff accounts and revokes sessions", async () => {
  const { db, tx } = database();
  await setOrderStaffStatus(owner, "staff", "INACTIVE", db);
  expect(tx.user.updateMany).toHaveBeenCalledWith({
    where: {
      id: "staff",
      role: "ORDER_STAFF",
      assignedShop: { ownerId: owner.id },
    },
    data: { status: "INACTIVE" },
  });
  expect(tx.authSession.deleteMany).toHaveBeenCalledWith({
    where: { userId: "staff" },
  });
});
it("scopes staff orders by assigned shop and denies unassigned staff before querying orders", async () => {
  const repository = {
    findManyOwned: vi.fn().mockResolvedValue([]),
    countOwnedByStatus: vi.fn().mockResolvedValue([]),
    findOwnedById: vi.fn(),
  } satisfies OwnerOrderRepository;
  await getOwnerOrderDashboard(staff, {}, repository);
  expect(repository.findManyOwned).toHaveBeenCalledWith(
    staff.id,
    {},
    staff.assignedShopId,
  );
  expect(repository.countOwnedByStatus).toHaveBeenCalledWith(
    staff.id,
    staff.assignedShopId,
  );
  vi.clearAllMocks();
  await expect(
    getOwnerOrderDashboard({ ...staff, assignedShopId: null }, {}, repository),
  ).rejects.toMatchObject({ status: 403 });
  expect(repository.findManyOwned).not.toHaveBeenCalled();
});
