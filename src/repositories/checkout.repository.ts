import {
  CatalogStatus,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";

const reservedProductSelect = {
  id: true,
  shopId: true,
  nameEn: true,
  price: true,
  stockQuantity: true,
  isAvailable: true,
  category: { select: { status: true } },
} satisfies Prisma.ProductSelect;

const orderConfirmationSelect = {
  id: true,
  customerId: true,
  status: true,
  paymentMethod: true,
  subtotal: true,
  deliveryFee: true,
  total: true,
  customerNote: true,
  createdAt: true,
  shop: { select: { name: true } },
  deliveryAddress: {
    select: { label: true, address: true },
  },
  items: {
    orderBy: { id: "asc" as const },
    select: {
      productId: true,
      quantity: true,
      unitPrice: true,
      product: { select: { nameEn: true } },
    },
  },
} satisfies Prisma.OrderSelect;

export type ReservedProductRecord = Prisma.ProductGetPayload<{
  select: typeof reservedProductSelect;
}>;

export type OrderConfirmationRecord = Prisma.OrderGetPayload<{
  select: typeof orderConfirmationSelect;
}>;

export interface CheckoutOrderData {
  customerId: string;
  shopId: string;
  deliveryAddressId: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  customerNote: string | null;
  items: Array<{ productId: string; quantity: number; unitPrice: string }>;
}

export interface CheckoutTransaction {
  findOwnedAddress(customerId: string, addressId: string): Promise<boolean>;
  reserveProduct(
    productId: string,
    quantity: number,
  ): Promise<ReservedProductRecord | null>;
  findProduct(productId: string): Promise<ReservedProductRecord | null>;
  createOrder(data: CheckoutOrderData): Promise<OrderConfirmationRecord>;
}

export interface CheckoutRepository {
  transaction<T>(
    operation: (transaction: CheckoutTransaction) => Promise<T>,
  ): Promise<T>;
  findOrderForCustomer(
    customerId: string,
    orderId: string,
  ): Promise<OrderConfirmationRecord | null>;
}

class PrismaCheckoutTransaction implements CheckoutTransaction {
  constructor(private readonly prisma: Prisma.TransactionClient) {}

  async findOwnedAddress(
    customerId: string,
    addressId: string,
  ): Promise<boolean> {
    return Boolean(
      await this.prisma.customerAddress.findFirst({
        where: { id: addressId, customerId },
        select: { id: true },
      }),
    );
  }

  async reserveProduct(
    productId: string,
    quantity: number,
  ): Promise<ReservedProductRecord | null> {
    const updated = await this.prisma.product.updateMany({
      where: {
        id: productId,
        isAvailable: true,
        stockQuantity: { gte: quantity },
        category: { status: CatalogStatus.ACTIVE },
      },
      data: { stockQuantity: { decrement: quantity } },
    });
    if (updated.count !== 1) return null;

    return this.findProduct(productId);
  }

  findProduct(productId: string): Promise<ReservedProductRecord | null> {
    return this.prisma.product.findUnique({
      where: { id: productId },
      select: reservedProductSelect,
    });
  }

  createOrder(data: CheckoutOrderData): Promise<OrderConfirmationRecord> {
    return this.prisma.order.create({
      data: {
        customerId: data.customerId,
        shopId: data.shopId,
        deliveryAddressId: data.deliveryAddressId,
        subtotal: data.subtotal,
        deliveryFee: data.deliveryFee,
        total: data.total,
        customerNote: data.customerNote,
        items: { create: data.items },
      },
      select: orderConfirmationSelect,
    });
  }
}

export class PrismaCheckoutRepository implements CheckoutRepository {
  constructor(private readonly prisma: PrismaClient) {}

  transaction<T>(
    operation: (transaction: CheckoutTransaction) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      (prismaTransaction) =>
        operation(new PrismaCheckoutTransaction(prismaTransaction)),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  findOrderForCustomer(
    customerId: string,
    orderId: string,
  ): Promise<OrderConfirmationRecord | null> {
    return this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      select: orderConfirmationSelect,
    });
  }
}
