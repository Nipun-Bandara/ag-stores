import { getDb } from "@/db";
import { isUniqueConstraintError } from "@/repositories/auth.repository";
import {
  isAddressInUseError,
  PrismaCustomerAddressRepository,
  type CustomerAddressRecord,
  type CustomerAddressRepository,
} from "@/repositories/customer-address.repository";
import type { AuthenticatedUser } from "@/types/auth";
import type { AddressInput } from "@/validations/address";

type CustomerAddressErrorCode =
  | "CUSTOMER_ONLY"
  | "ADDRESS_NOT_FOUND"
  | "DUPLICATE_ADDRESS_LABEL"
  | "ADDRESS_IN_USE";

export interface CustomerAddressView {
  id: string;
  label: string;
  address: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
}

export class CustomerAddressError extends Error {
  constructor(
    readonly code: CustomerAddressErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CustomerAddressError";
  }
}

function getAddressRepository(): CustomerAddressRepository {
  return new PrismaCustomerAddressRepository(getDb());
}

function assertCustomer(user: AuthenticatedUser): void {
  if (user.role !== "CUSTOMER") {
    throw new CustomerAddressError(
      "CUSTOMER_ONLY",
      "Customer access is required.",
      403,
    );
  }
}

function toAddressView(address: CustomerAddressRecord): CustomerAddressView {
  return {
    ...address,
    latitude: address.latitude.toString(),
    longitude: address.longitude.toString(),
  };
}

async function handleWrite<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new CustomerAddressError(
        "DUPLICATE_ADDRESS_LABEL",
        "An address with that label already exists.",
        409,
      );
    }
    if (isAddressInUseError(error)) {
      throw new CustomerAddressError(
        "ADDRESS_IN_USE",
        "This address is attached to an order and cannot be deleted.",
        409,
      );
    }
    throw error;
  }
}

export async function listCustomerAddresses(
  user: AuthenticatedUser,
  repository: CustomerAddressRepository = getAddressRepository(),
): Promise<CustomerAddressView[]> {
  assertCustomer(user);
  return (await repository.findMany(user.id)).map(toAddressView);
}

export async function createCustomerAddress(
  user: AuthenticatedUser,
  input: AddressInput,
  repository: CustomerAddressRepository = getAddressRepository(),
): Promise<CustomerAddressView> {
  assertCustomer(user);
  return toAddressView(
    await handleWrite(() => repository.create(user.id, input)),
  );
}

export async function updateCustomerAddress(
  user: AuthenticatedUser,
  addressId: string,
  input: AddressInput,
  repository: CustomerAddressRepository = getAddressRepository(),
): Promise<CustomerAddressView> {
  assertCustomer(user);
  const address = await handleWrite(() =>
    repository.update(user.id, addressId, input),
  );
  if (!address) {
    throw new CustomerAddressError(
      "ADDRESS_NOT_FOUND",
      "Address not found.",
      404,
    );
  }
  return toAddressView(address);
}

export async function setDefaultCustomerAddress(
  user: AuthenticatedUser,
  addressId: string,
  repository: CustomerAddressRepository = getAddressRepository(),
): Promise<CustomerAddressView> {
  assertCustomer(user);
  const address = await handleWrite(() =>
    repository.setDefault(user.id, addressId),
  );
  if (!address) {
    throw new CustomerAddressError(
      "ADDRESS_NOT_FOUND",
      "Address not found.",
      404,
    );
  }
  return toAddressView(address);
}

export async function deleteCustomerAddress(
  user: AuthenticatedUser,
  addressId: string,
  repository: CustomerAddressRepository = getAddressRepository(),
): Promise<void> {
  assertCustomer(user);
  const deleted = await handleWrite(() =>
    repository.delete(user.id, addressId),
  );
  if (!deleted) {
    throw new CustomerAddressError(
      "ADDRESS_NOT_FOUND",
      "Address not found.",
      404,
    );
  }
}
