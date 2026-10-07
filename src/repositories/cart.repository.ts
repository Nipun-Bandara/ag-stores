import { Prisma, type PrismaClient } from "@/generated/prisma/client";

const cartProductSelect = {
  id: true,
  nameEn: true,
  price: true,
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
    return this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: cartProductSelect,
    });
  }
}
