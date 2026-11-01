import { describe, expect, it, vi } from "vitest";

import {
  AuditAction,
  AuditEntityType,
  PreferredLanguage,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import { sanitizeAuditMetadata } from "@/repositories/audit-write.repository";
import type { AuditLogRepository } from "@/repositories/audit-log.repository";
import {
  AuditLogError,
  getAuditLogPage,
  listAuditLogs,
} from "@/services/audit-log.service";
import type { AuthenticatedUser } from "@/types/auth";

const admin: AuthenticatedUser = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Administrator",
  email: "admin@example.test",
  phone: null,
  role: UserRole.ADMIN,
  preferredLanguage: PreferredLanguage.EN,
  status: UserStatus.ACTIVE,
};

describe("audit logging", () => {
  it("removes authentication secrets from nested metadata", () => {
    expect(
      sanitizeAuditMetadata({
        previousPrice: "10.00",
        password: "never-store-this",
        passwordHash: "never-store-this-either",
        nested: {
          accessToken: "secret-token",
          status: "ACTIVE",
          cookie: "session-cookie",
        },
      }),
    ).toEqual({
      previousPrice: "10.00",
      nested: { status: "ACTIVE" },
    });
  });

  it("allows administrators to read safe audit records", async () => {
    const repository: AuditLogRepository = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "00000000-0000-4000-8000-000000000002",
          actorId: admin.id,
          action: AuditAction.PRODUCT_PRICE_UPDATED,
          entityType: AuditEntityType.PRODUCT,
          entityId: "00000000-0000-4000-8000-000000000003",
          metadata: { previousPrice: "10.00", newPrice: "12.00" },
          createdAt: new Date("2026-10-08T12:00:00.000Z"),
        },
      ]),
    };

    await expect(listAuditLogs(admin, {}, repository)).resolves.toMatchObject([
      {
        actorId: admin.id,
        action: AuditAction.PRODUCT_PRICE_UPDATED,
        createdAt: "2026-10-08T12:00:00.000Z",
      },
    ]);
  });

  it("rejects normal users before reading the repository", async () => {
    const repository: AuditLogRepository = { findMany: vi.fn() };

    await expect(
      listAuditLogs({ ...admin, role: UserRole.CUSTOMER }, {}, repository),
    ).rejects.toMatchObject<Partial<AuditLogError>>({
      code: "ADMIN_ONLY",
      status: 403,
    });
    expect(repository.findMany).not.toHaveBeenCalled();
  });
});

describe("audit log pagination", () => {
  it("returns one page and uses the extra row only to determine whether another page exists", async () => {
    const records = Array.from({ length: 26 }, (_, index) => ({
      id: String(index),
      actorId: admin.id,
      actorName: admin.name,
      action: AuditAction.SHOP_UPDATED,
      entityType: AuditEntityType.SHOP,
      entityId: "shop-id",
      entityName: "Shop",
      metadata: null,
      createdAt: new Date("2026-10-31T00:00:00Z"),
    }));
    const repository: AuditLogRepository = {
      findMany: vi.fn().mockResolvedValue(records),
    };
    const result = await getAuditLogPage(
      admin,
      { page: "5", pageSize: "25" },
      { entityType: AuditEntityType.SHOP },
      repository,
    );
    expect(repository.findMany).toHaveBeenCalledWith(
      { entityType: AuditEntityType.SHOP },
      { page: 5, pageSize: 25 },
    );
    expect(result.records).toHaveLength(25);
    expect(result).toMatchObject({
      page: 5,
      pageSize: 25,
      hasPrevious: true,
      hasNext: true,
    });
    expect(result.records[0]?.createdAt).toBe("2026-10-31T00:00:00.000Z");
  });

  it("defaults invalid pagination and disables navigation for an empty first page", async () => {
    const repository: AuditLogRepository = {
      findMany: vi.fn().mockResolvedValue([]),
    };
    expect(
      await getAuditLogPage(
        admin,
        { page: "-1", pageSize: "10000" },
        {},
        repository,
      ),
    ).toMatchObject({
      page: 1,
      pageSize: 25,
      hasPrevious: false,
      hasNext: false,
      records: [],
    });
    expect(repository.findMany).toHaveBeenCalledWith(
      {},
      { page: 1, pageSize: 25 },
    );
  });

  it("allows recovery from an empty later page", async () => {
    const repository: AuditLogRepository = {
      findMany: vi.fn().mockResolvedValue([]),
    };
    expect(
      await getAuditLogPage(admin, { page: 3, pageSize: 10 }, {}, repository),
    ).toMatchObject({ hasPrevious: true, hasNext: false });
  });

  it("rejects non-admins before fetching a page", async () => {
    const repository: AuditLogRepository = { findMany: vi.fn() };
    await expect(
      getAuditLogPage(
        { ...admin, role: UserRole.CUSTOMER },
        {},
        {},
        repository,
      ),
    ).rejects.toMatchObject({ code: "ADMIN_ONLY" });
    expect(repository.findMany).not.toHaveBeenCalled();
  });
});
