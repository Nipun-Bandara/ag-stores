// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  GET as listPersonnelRoute,
  POST as createPersonnelRoute,
} from "@/app/api/delivery-personnel/route";
import { PATCH as updatePersonnelRoute } from "@/app/api/delivery-personnel/[personId]/route";
import { PATCH as updatePersonnelStatusRoute } from "@/app/api/delivery-personnel/[personId]/status/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { PrismaClient, UserRole, UserStatus } from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";
import { hashSessionToken } from "@/lib/auth/session-token";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

function apiRequest(
  path: string,
  token: string,
  method = "GET",
  body?: unknown,
) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function personContext(personId: string) {
  return { params: Promise.resolve({ personId }) };
}

async function login(email: string, password = "ChangeMe123!") {
  const response = await loginRoute(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, password }),
    }),
  );
  return {
    response,
    token: response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "",
  };
}

describeWithDatabase("delivery personnel management API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const sessionTokens: string[] = [];
  let ownerToken = "";
  let adminToken = "";
  let customerToken = "";
  let deliveryToken = "";
  let ownerShopId = "";
  let createdPersonId = "";
  let temporaryPassword = "";
  let foreignOwnerId = "";
  let foreignShopId = "";
  let foreignPersonId = "";

  beforeAll(async () => {
    const [ownerLogin, adminLogin, customerLogin, deliveryLogin] =
      await Promise.all([
        login("owner@agstores.local"),
        login("admin@agstores.local"),
        login("customer@agstores.local"),
        login("delivery@agstores.local"),
      ]);
    ownerToken = ownerLogin.token;
    adminToken = adminLogin.token;
    customerToken = customerLogin.token;
    deliveryToken = deliveryLogin.token;
    sessionTokens.push(ownerToken, adminToken, customerToken, deliveryToken);

    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: "owner@agstores.local" },
    });
    ownerShopId = (
      await prisma.shop.findFirstOrThrow({ where: { ownerId: owner.id } })
    ).id;

    const passwordHash = await hashPassword("ForeignPassword123!");
    const foreignOwner = await prisma.user.create({
      data: {
        name: "Foreign Shop Owner",
        email: `foreign-owner-${suffix}@example.test`,
        phone: `+9471${suffix.replace(/\D/g, "").padEnd(8, "1").slice(0, 8)}`,
        passwordHash,
        role: UserRole.SHOP_OWNER,
      },
    });
    foreignOwnerId = foreignOwner.id;
    const foreignShop = await prisma.shop.create({
      data: {
        ownerId: foreignOwner.id,
        name: `Foreign Delivery Shop ${suffix}`,
        address: "90 Foreign Shop Road",
        latitude: "6.900000",
        longitude: "79.800000",
        phone: `+9411${suffix.replace(/\D/g, "").padEnd(8, "2").slice(0, 8)}`,
      },
    });
    foreignShopId = foreignShop.id;
    const foreignPerson = await prisma.user.create({
      data: {
        assignedShopId: foreignShop.id,
        name: "Foreign Delivery Person",
        email: `foreign-delivery-${suffix}@example.test`,
        phone: `+9472${suffix.replace(/\D/g, "").padEnd(8, "3").slice(0, 8)}`,
        passwordHash,
        role: UserRole.DELIVERY_PERSON,
      },
    });
    foreignPersonId = foreignPerson.id;
  });

  afterAll(async () => {
    if (createdPersonId) {
      await prisma.authSession.deleteMany({
        where: { userId: createdPersonId },
      });
      await prisma.user.deleteMany({ where: { id: createdPersonId } });
    }
    if (foreignPersonId) {
      await prisma.user.deleteMany({ where: { id: foreignPersonId } });
    }
    if (foreignShopId) {
      await prisma.shop.deleteMany({ where: { id: foreignShopId } });
    }
    if (foreignOwnerId) {
      await prisma.user.deleteMany({ where: { id: foreignOwnerId } });
    }
    await prisma.authSession.deleteMany({
      where: {
        tokenHash: {
          in: sessionTokens.filter(Boolean).map(hashSessionToken),
        },
      },
    });
    await prisma.$disconnect();
  });

  it("allows an owner to create a delivery account for their shop", async () => {
    const email = `managed-delivery-${suffix}@example.test`;
    const phone = `+9473${suffix.replace(/\D/g, "").padEnd(8, "4").slice(0, 8)}`;
    const response = await createPersonnelRoute(
      apiRequest("/api/delivery-personnel", ownerToken, "POST", {
        name: "Managed Delivery Person",
        email,
        phone,
        assignedShopId: ownerShopId,
        status: UserStatus.ACTIVE,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.personnel).toMatchObject({
      name: "Managed Delivery Person",
      email,
      phone,
      role: UserRole.DELIVERY_PERSON,
      status: UserStatus.ACTIVE,
      assignedShopId: ownerShopId,
    });
    expect(payload.data.personnel).not.toHaveProperty("passwordHash");
    expect(payload.data.temporaryPassword).toEqual(expect.any(String));
    createdPersonId = payload.data.personnel.id;
    temporaryPassword = payload.data.temporaryPassword;

    expect(
      await prisma.user.findUniqueOrThrow({ where: { id: createdPersonId } }),
    ).toMatchObject({
      role: UserRole.DELIVERY_PERSON,
      assignedShopId: ownerShopId,
    });
  });

  it("lists and updates only personnel assigned to the owner's shops", async () => {
    const listResponse = await listPersonnelRoute(
      apiRequest("/api/delivery-personnel", ownerToken),
    );
    const listPayload = await listResponse.json();
    expect(listResponse.status).toBe(200);
    expect(listPayload.data.personnel).toContainEqual(
      expect.objectContaining({ id: createdPersonId }),
    );
    expect(listPayload.data.personnel).not.toContainEqual(
      expect.objectContaining({ id: foreignPersonId }),
    );

    const response = await updatePersonnelRoute(
      apiRequest(
        `/api/delivery-personnel/${createdPersonId}`,
        ownerToken,
        "PATCH",
        {
          name: "Updated Delivery Person",
          email: `updated-delivery-${suffix}@example.test`,
          phone: `+9474${suffix.replace(/\D/g, "").padEnd(8, "5").slice(0, 8)}`,
          assignedShopId: ownerShopId,
        },
      ),
      personContext(createdPersonId),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data.name).toBe("Updated Delivery Person");
  });

  it("rejects creation by customers and delivery personnel", async () => {
    const input = {
      name: "Forbidden Delivery Person",
      email: `forbidden-delivery-${suffix}@example.test`,
      phone: `+9475${suffix.replace(/\D/g, "").padEnd(8, "6").slice(0, 8)}`,
      assignedShopId: ownerShopId,
      status: UserStatus.ACTIVE,
    };
    for (const token of [customerToken, deliveryToken]) {
      const response = await createPersonnelRoute(
        apiRequest("/api/delivery-personnel", token, "POST", input),
      );
      expect(response.status).toBe(403);
    }
  });

  it("prevents an owner from managing personnel assigned to another shop", async () => {
    const response = await updatePersonnelStatusRoute(
      apiRequest(
        `/api/delivery-personnel/${foreignPersonId}/status`,
        ownerToken,
        "PATCH",
        { status: UserStatus.INACTIVE },
      ),
      personContext(foreignPersonId),
    );
    expect(response.status).toBe(404);
    expect(
      await prisma.user.findUniqueOrThrow({ where: { id: foreignPersonId } }),
    ).toMatchObject({ status: UserStatus.ACTIVE });
  });

  it("allows an administrator to view and manage all delivery personnel", async () => {
    const listResponse = await listPersonnelRoute(
      apiRequest("/api/delivery-personnel", adminToken),
    );
    const listPayload = await listResponse.json();
    expect(listResponse.status).toBe(200);
    expect(listPayload.data.personnel).toContainEqual(
      expect.objectContaining({ id: foreignPersonId }),
    );

    const statusResponse = await updatePersonnelStatusRoute(
      apiRequest(
        `/api/delivery-personnel/${foreignPersonId}/status`,
        adminToken,
        "PATCH",
        { status: UserStatus.INACTIVE },
      ),
      personContext(foreignPersonId),
    );
    expect(statusResponse.status).toBe(200);
    expect((await statusResponse.json()).data.status).toBe(UserStatus.INACTIVE);
  });

  it("prevents an inactive delivery user from logging in", async () => {
    const activeLogin = await login(
      `updated-delivery-${suffix}@example.test`,
      temporaryPassword,
    );
    expect(activeLogin.response.status).toBe(200);
    sessionTokens.push(activeLogin.token);

    const response = await updatePersonnelStatusRoute(
      apiRequest(
        `/api/delivery-personnel/${createdPersonId}/status`,
        ownerToken,
        "PATCH",
        { status: UserStatus.INACTIVE },
      ),
      personContext(createdPersonId),
    );
    expect(response.status).toBe(200);

    const inactiveLogin = await login(
      `updated-delivery-${suffix}@example.test`,
      temporaryPassword,
    );
    expect(inactiveLogin.response.status).toBe(401);
    expect((await inactiveLogin.response.json()).error).toMatchObject({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email/phone or password.",
    });
  });
});
