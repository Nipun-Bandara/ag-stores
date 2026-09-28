import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { ProductGrid } from "@/features/storefront/components/product-grid";
import { StorefrontFooter } from "@/features/storefront/components/storefront-footer";
import { StorefrontHeader } from "@/features/storefront/components/storefront-header";
import {
  getStorefrontCategory,
  listStorefrontProducts,
} from "@/services/storefront.service";
import { categoryIdSchema } from "@/validations/category";

export const metadata: Metadata = { title: "Category | AG Stores" };

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const categoryId = categoryIdSchema.safeParse((await params).id);
  if (!categoryId.success) notFound();

  const [category, products] = await Promise.all([
    getStorefrontCategory(categoryId.data),
    listStorefrontProducts({ categoryId: categoryId.data }),
  ]);
  if (!category) notFound();

  return (
    <div className="min-h-screen bg-[#fffdf7]">
      <StorefrontHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-sm font-bold text-emerald-700">
          {category.shopName}
        </p>
        <h1 className="mt-1 text-4xl font-black tracking-tight text-emerald-950">
          {category.nameEn}
        </h1>
        {category.nameSi ? (
          <p className="mt-2 text-lg text-neutral-500">{category.nameSi}</p>
        ) : null}
        <p className="mt-7 text-sm font-semibold text-neutral-500">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
        <div className="mt-4">
          <ProductGrid
            products={products}
            emptyMessage="There are no available products in this category yet."
          />
        </div>
      </main>
      <StorefrontFooter />
    </div>
  );
}
