import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { ProductForm } from "@/features/owner/components/product-form";
import { requireRole } from "@/lib/auth/server";
import {
  getOwnerProduct,
  getProductFormOptions,
  ProductError,
} from "@/services/product.service";
import { productIdSchema } from "@/validations/product";

export const metadata: Metadata = { title: "Edit product | AG Stores" };

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
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <RoleAwareNavigation user={user} />
      <section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">Edit product</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Update product information without changing its shop.
        </p>
        <ProductForm options={options} product={product} />
      </section>
    </main>
  );
}
