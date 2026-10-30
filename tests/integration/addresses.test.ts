// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  GET as listAddresses,
  POST as createAddress,
} from "@/app/api/account/addresses/route";
import {
  DELETE as deleteAddress,
  PATCH as updateAddress,
} from "@/app/api/account/addresses/[addressId]/route";
import { POST as makeDefaultAddress } from "@/app/api/account/addresses/[addressId]/default/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { PrismaClient } from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

function request(path: string, method: string, token?: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function context(addressId: string) {
  return { params: Promise.resolve({ addressId }) };
}

describeWithDatabase("customer delivery address API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const userIds: string[] = [];
  let token: string;
  let otherToken: string;
  let homeId: string;
  let officeId: string;

  beforeAll(async () => {
    async function register(email: string) {
      const response = await registerRoute(
        request("/api/auth/register", "POST", undefined, {
          name: "Address Customer",
          email,
          phone: "",
          password: "SecurePassword123!",
          preferredLanguage: "EN",
        }),
      );
      const body = await response.json();
      userIds.push(body.data.id);
      return response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
    }

    token = await register(`address-${suffix}@example.test`);
    otherToken = await register(`address-other-${suffix}@example.test`);
  });

  afterAll(async () => {
    await prisma.customerAddress.deleteMany({
      where: { customerId: { in: userIds } },
    });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("validates required fields and coordinate ranges", async () => {
    const missingFields = await createAddress(
      request("/api/account/addresses", "POST", token, {
        label: "",
        address: "",
        latitude: 6.9,
        longitude: 79.8,
      }),
    );
    const invalidCoordinates = await createAddress(
      request("/api/account/addresses", "POST", token, {
        label: "Invalid",
        address: "Somewhere",
        latitude: 91,
        longitude: -181,
      }),
    );

    expect(missingFields.status).toBe(400);
    expect(invalidCoordinates.status).toBe(400);
  });

  it("creates addresses and automatically defaults the first", async () => {
    const home = await createAddress(
      request("/api/account/addresses", "POST", token, {
        label: "Home",
        address: "1 Main Street, Colombo",
        latitude: "6.927079",
        longitude: "79.861244",
      }),
    );
    const homeBody = await home.json();
    homeId = homeBody.data.id;

    const office = await createAddress(
      request("/api/account/addresses", "POST", token, {
        label: "Office",
        address: "2 Work Road, Colombo",
        latitude: "6.901234",
        longitude: "79.876543",
      }),
    );
    const officeBody = await office.json();
    officeId = officeBody.data.id;

    expect(home.status).toBe(201);
    expect(homeBody.data).toMatchObject({
      latitude: "6.927079",
      longitude: "79.861244",
      isDefault: true,
    });
    expect(office.status).toBe(201);
    expect(officeBody.data.isDefault).toBe(false);
  });

  it("retrieves only the authenticated customer's addresses", async () => {
    const ownResponse = await listAddresses(
      request("/api/account/addresses", "GET", token),
    );
    const otherResponse = await listAddresses(
      request("/api/account/addresses", "GET", otherToken),
    );

    expect((await ownResponse.json()).data).toHaveLength(2);
    expect((await otherResponse.json()).data).toEqual([]);
  });

  it("edits an owned address", async () => {
    const response = await updateAddress(
      request(`/api/account/addresses/${officeId}`, "PATCH", token, {
        label: "Office",
        address: "20 Updated Work Road, Colombo",
        latitude: "6.912345",
        longitude: "79.887654",
      }),
      context(officeId),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      address: "20 Updated Work Road, Colombo",
      latitude: "6.912345",
    });
  });

  it("prevents access to another customer's address", async () => {
    const updateResponse = await updateAddress(
      request(`/api/account/addresses/${homeId}`, "PATCH", otherToken, {
        label: "Stolen",
        address: "Changed",
        latitude: 1,
        longitude: 1,
      }),
      context(homeId),
    );
    const defaultResponse = await makeDefaultAddress(
      request(`/api/account/addresses/${homeId}/default`, "POST", otherToken),
      context(homeId),
    );
    const deleteResponse = await deleteAddress(
      request(`/api/account/addresses/${homeId}`, "DELETE", otherToken),
      context(homeId),
    );

    expect(updateResponse.status).toBe(404);
    expect(defaultResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
  });

  it("switches the default address atomically", async () => {
    const response = await makeDefaultAddress(
      request(`/api/account/addresses/${officeId}/default`, "POST", token),
      context(officeId),
    );
    const addresses = await prisma.customerAddress.findMany({
      where: { id: { in: [homeId, officeId] } },
      select: { id: true, isDefault: true },
    });

    expect(response.status).toBe(200);
    expect(addresses.filter(({ isDefault }) => isDefault)).toEqual([
      { id: officeId, isDefault: true },
    ]);
  });

  it("deletes an address and promotes a replacement default", async () => {
    const response = await deleteAddress(
      request(`/api/account/addresses/${officeId}`, "DELETE", token),
      context(officeId),
    );
    const home = await prisma.customerAddress.findUniqueOrThrow({
      where: { id: homeId },
    });

    expect(response.status).toBe(204);
    expect(home.isDefault).toBe(true);
  });
});
