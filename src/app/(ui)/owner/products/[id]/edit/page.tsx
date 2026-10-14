import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { ProductForm } from "@/features/owner/components/product-form";
import { requireRole } from "@/lib/auth/server";
import {
  getOwnerProduct,
  getProductFormOptions,
  ProductError,
} from "@/services/product.service";
import { productIdSchema } from "@/validations/product";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Edit product")} | AG Stores` };
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(UserRole.SHOP_OWNER, "/owner/products");
  const productId = productIdSchema.safeParse((await params).id);
  if (!productId.success) notFound();

  const [product, options] = await Promise.all([
    getOwnerProduct(user, productId.data),
    getProductFormOptions(user),
  ]).catch((error: unknown) => {
    if (error instanceof ProductError && error.status === 404) notFound();
    throw error;
  });

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value={"Edit product"} />
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text
          value={"Update product information without changing its shop. "}
        />
      </p>
      <ProductForm options={options} product={product} />
    </section>
  );
}
