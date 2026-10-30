import {
  Prisma,
  type PrismaClient,
  type CustomerAddress,
} from "@/generated/prisma/client";
import type { AddressInput } from "@/validations/address";

export type CustomerAddressRecord = Pick<
  CustomerAddress,
  "id" | "label" | "address" | "latitude" | "longitude" | "isDefault"
>;

export interface CustomerAddressRepository {
  findMany(customerId: string): Promise<CustomerAddressRecord[]>;
  create(
    customerId: string,
    input: AddressInput,
  ): Promise<CustomerAddressRecord>;
  update(
    customerId: string,
    addressId: string,
    input: AddressInput,
  ): Promise<CustomerAddressRecord | null>;
  setDefault(
    customerId: string,
    addressId: string,
  ): Promise<CustomerAddressRecord | null>;
  delete(customerId: string, addressId: string): Promise<boolean>;
}

const addressSelect = {
  id: true,
  label: true,
  address: true,
  latitude: true,
  longitude: true,
  isDefault: true,
} satisfies Prisma.CustomerAddressSelect;

export class PrismaCustomerAddressRepository implements CustomerAddressRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany(customerId: string): Promise<CustomerAddressRecord[]> {
    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: "desc" }, { label: "asc" }, { id: "asc" }],
      select: addressSelect,
    });
  }

  create(
    customerId: string,
    input: AddressInput,
  ): Promise<CustomerAddressRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const addressCount = await transaction.customerAddress.count({
        where: { customerId },
      });
      const makeDefault = input.isDefault || addressCount === 0;

      if (makeDefault) {
        await transaction.customerAddress.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return transaction.customerAddress.create({
        data: {
          customerId,
          label: input.label,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          isDefault: makeDefault,
        },
        select: addressSelect,
      });
    });
  }

  update(
    customerId: string,
    addressId: string,
    input: AddressInput,
  ): Promise<CustomerAddressRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.customerAddress.findFirst({
        where: { id: addressId, customerId },
        select: { id: true },
      });
      if (!existing) return null;

      if (input.isDefault) {
        await transaction.customerAddress.updateMany({
          where: { customerId, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      return transaction.customerAddress.update({
        where: { id: addressId },
        data: {
          label: input.label,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          ...(input.isDefault ? { isDefault: true } : {}),
        },
        select: addressSelect,
      });
    });
  }

  setDefault(
    customerId: string,
    addressId: string,
  ): Promise<CustomerAddressRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.customerAddress.findFirst({
        where: { id: addressId, customerId },
        select: { id: true },
      });
      if (!existing) return null;

      await transaction.customerAddress.updateMany({
        where: { customerId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });

      return transaction.customerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
        select: addressSelect,
      });
    });
  }

  delete(customerId: string, addressId: string): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.customerAddress.findFirst({
        where: { id: addressId, customerId },
        select: { id: true, isDefault: true },
      });
      if (!existing) return false;

      await transaction.customerAddress.delete({ where: { id: addressId } });

      if (existing.isDefault) {
        const replacement = await transaction.customerAddress.findFirst({
          where: { customerId },
          orderBy: [{ label: "asc" }, { id: "asc" }],
          select: { id: true },
        });
        if (replacement) {
          await transaction.customerAddress.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
        }
      }

      return true;
    });
  }
}

export function isAddressInUseError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}
