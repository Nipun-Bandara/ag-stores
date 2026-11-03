import { Prisma, type PrismaClient } from "@/generated/prisma/client";

const cartProductSelect = {
  id: true,
  nameEn: true,
  nameSi: true,
  price: true,
  discountTiers: {
    orderBy: { position: "asc" as const },
    select: { minimumQuantity: true, discountAmount: true },
  },
  sellingUnit: true,
  minimumOrderQuantity: true,
  orderingIncrement: true,
  stockQuantity: true,
  isAvailable: true,
  category: { select: { status: true } },
  shop: { select: { id: true, deliveryFee: true } },
} satisfies Prisma.ProductSelect;

export type CartProductRecord = Prisma.ProductGetPayload<{
  select: typeof cartProductSelect;
}>;

export interface CartRepository {
  findProductsByIds(productIds: string[]): Promise<CartProductRecord[]>;
}

export class PrismaCartRepository implements CartRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findProductsByIds(productIds: string[]): Promise<CartProductRecord[]> {
    return this.prisma.$transaction(
      (transaction) =>
        transaction.product.findMany({
          where: { id: { in: productIds }, shop: { isActive: true } },
          select: cartProductSelect,
        }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
