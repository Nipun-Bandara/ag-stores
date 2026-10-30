import { randomBytes } from "node:crypto";

import { getDb } from "@/db";
import { UserRole } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { isUniqueConstraintError } from "@/repositories/auth.repository";
import {
  PrismaDeliveryPersonnelRepository,
  type DeliveryPersonnelRecord,
  type DeliveryPersonnelRepository,
  type DeliveryPersonnelScope,
} from "@/repositories/delivery-personnel.repository";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  DeliveryPersonnelCreateInput,
  DeliveryPersonnelStatusInput,
  DeliveryPersonnelUpdateInput,
} from "@/validations/delivery-personnel";

type DeliveryPersonnelErrorCode =
  | "MANAGEMENT_FORBIDDEN"
  | "SHOP_NOT_FOUND"
  | "DELIVERY_PERSON_NOT_FOUND"
  | "DUPLICATE_CONTACT";

export class DeliveryPersonnelError extends Error {
  constructor(
    readonly code: DeliveryPersonnelErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DeliveryPersonnelError";
  }
}

function repository(): DeliveryPersonnelRepository {
  return new PrismaDeliveryPersonnelRepository(getDb());
}

function scopeFor(user: AuthenticatedUser): DeliveryPersonnelScope {
  if (user.role === UserRole.ADMIN) return { kind: "all" };
  if (user.role === UserRole.SHOP_OWNER) {
    return { kind: "owner", ownerId: user.id };
  }
  throw new DeliveryPersonnelError(
    "MANAGEMENT_FORBIDDEN",
    "Shop owner or administrator access is required.",
    403,
  );
}

function toView(person: DeliveryPersonnelRecord) {
  return {
    id: person.id,
    name: person.name,
    email: person.email,
    phone: person.phone,
    role: person.role,
    status: person.status,
    assignedShopId: person.assignedShopId,
    assignedShopName: person.assignedShop?.name ?? null,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
  };
}

async function assertUsableShop(
  scope: DeliveryPersonnelScope,
  shopId: string,
  personnel: DeliveryPersonnelRepository,
) {
  if (!(await personnel.canUseShop(scope, shopId))) {
    throw new DeliveryPersonnelError("SHOP_NOT_FOUND", "Shop not found.", 404);
  }
}

async function handleUnique<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DeliveryPersonnelError(
        "DUPLICATE_CONTACT",
        "An account already exists with that email or phone number.",
        409,
      );
    }
    throw error;
  }
}

export async function getDeliveryPersonnelManagement(
  user: AuthenticatedUser,
  personnel: DeliveryPersonnelRepository = repository(),
) {
  const scope = scopeFor(user);
  const [shops, records] = await Promise.all([
    personnel.findShops(scope),
    personnel.findPersonnel(scope),
  ]);
  return { shops, personnel: records.map(toView) };
}

export async function createDeliveryPerson(
  user: AuthenticatedUser,
  input: DeliveryPersonnelCreateInput,
  personnel: DeliveryPersonnelRepository = repository(),
) {
  const scope = scopeFor(user);
  await assertUsableShop(scope, input.assignedShopId, personnel);
  const temporaryPassword = `Ag!${randomBytes(12).toString("base64url")}7a`;
  const passwordHash = await hashPassword(temporaryPassword);
  const created = await handleUnique(() =>
    personnel.create(input, passwordHash),
  );
  return { personnel: toView(created), temporaryPassword };
}

export async function updateDeliveryPerson(
  user: AuthenticatedUser,
  personId: string,
  input: DeliveryPersonnelUpdateInput,
  personnel: DeliveryPersonnelRepository = repository(),
) {
  const scope = scopeFor(user);
  await assertUsableShop(scope, input.assignedShopId, personnel);
  const updated = await handleUnique(() =>
    personnel.updateManaged(scope, personId, input),
  );
  if (!updated) {
    throw new DeliveryPersonnelError(
      "DELIVERY_PERSON_NOT_FOUND",
      "Delivery person not found.",
      404,
    );
  }
  return toView(updated);
}

export async function setDeliveryPersonStatus(
  user: AuthenticatedUser,
  personId: string,
  input: DeliveryPersonnelStatusInput,
  personnel: DeliveryPersonnelRepository = repository(),
) {
  const updated = await personnel.setStatusManaged(
    scopeFor(user),
    personId,
    input.status,
  );
  if (!updated) {
    throw new DeliveryPersonnelError(
      "DELIVERY_PERSON_NOT_FOUND",
      "Delivery person not found.",
      404,
    );
  }
  return toView(updated);
}

export type DeliveryPersonnelManagementView = Awaited<
  ReturnType<typeof getDeliveryPersonnelManagement>
>;
export type DeliveryPersonnelView =
  DeliveryPersonnelManagementView["personnel"][number];
