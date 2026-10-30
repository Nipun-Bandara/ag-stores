import { describe, expect, it, vi } from "vitest";

import {
  PreferredLanguage,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import type { AdminShopRepository } from "@/repositories/admin-shop.repository";
import {
  getAdminShopManagement,
  setAdminShopStatus,
} from "@/services/admin-shop.service";
import type { AuthenticatedUser } from "@/types/auth";

const administrator: AuthenticatedUser = {
  id: "admin-id",
  name: "Administrator",
  email: "admin@example.test",
  phone: null,
  role: UserRole.ADMIN,
  preferredLanguage: PreferredLanguage.EN,
  status: UserStatus.ACTIVE,
};

function repository(): AdminShopRepository {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findAssignableOwners: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ kind: "owner_not_found" }),
    update: vi.fn().mockResolvedValue({ kind: "shop_not_found" }),
    setActive: vi.fn().mockResolvedValue(null),
  };
}

describe("admin shop service", () => {
  it("loads all shops and assignable owners for an administrator", async () => {
    const shops = repository();
    await expect(getAdminShopManagement(administrator, shops)).resolves.toEqual(
      { shops: [], owners: [] },
    );
    expect(shops.findMany).toHaveBeenCalledOnce();
    expect(shops.findAssignableOwners).toHaveBeenCalledOnce();
  });

  it("rejects non-admin users before reading or changing shops", async () => {
    for (const role of [
      UserRole.CUSTOMER,
      UserRole.SHOP_OWNER,
      UserRole.DELIVERY_PERSON,
    ]) {
      const shops = repository();
      const actor = { ...administrator, role };
      await expect(getAdminShopManagement(actor, shops)).rejects.toMatchObject({
        code: "ADMIN_ONLY",
        status: 403,
      });
      await expect(
        setAdminShopStatus(actor, "shop-id", { isActive: false }, shops),
      ).rejects.toMatchObject({ code: "ADMIN_ONLY", status: 403 });
      expect(shops.findMany).not.toHaveBeenCalled();
      expect(shops.setActive).not.toHaveBeenCalled();
    }
  });
});
