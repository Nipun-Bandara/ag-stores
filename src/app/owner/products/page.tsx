import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { ProductList } from "@/features/owner/components/product-list";
import { requireRole } from "@/lib/auth/server";
import {
  getProductFormOptions,
  listOwnerProducts,
} from "@/services/product.service";
import {
  productCategoryFilterSchema,
  productSearchSchema,
} from "@/validations/product";

export const metadata: Metadata = { title: "Products | AG Stores" };

interface ProductsPageProps {
  searchParams: Promise<{
    categoryId?: string | string[];
    search?: string | string[];
  }>;
}

export default async function OwnerProductsPage({
  searchParams,
}: ProductsPageProps) {
  const user = await requireRole(UserRole.SHOP_OWNER, "/owner/products");
  const query = await searchParams;
  const categoryValue = Array.isArray(query.categoryId)
    ? query.categoryId[0]
    : query.categoryId;
  const searchValue = Array.isArray(query.search)
    ? query.search[0]
    : query.search;
  const category = categoryValue
    ? productCategoryFilterSchema.safeParse(categoryValue)
    : undefined;
  const search = searchValue
    ? productSearchSchema.safeParse(searchValue)
    : undefined;
  const filters = {
    ...(category?.success ? { categoryId: category.data } : {}),
    ...(search?.success && search.data ? { search: search.data } : {}),
  };
  const [products, options] = await Promise.all([
    listOwnerProducts(user, filters),
    getProductFormOptions(user),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16">
      <RoleAwareNavigation user={user} />
      <section className="pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Manage product details, availability, prices, and stock.
            </p>
          </div>
          <Link
            href="/owner/products/new"
            className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium text-white"
          >
            Add product
          </Link>
        </div>
        <form className="mt-8 grid gap-4 rounded-xl border p-5 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-medium" htmlFor="search">
            Search
            <input
              id="search"
              name="search"
              defaultValue={search?.success ? search.data : ""}
              placeholder="Name or description"
              className="mt-1.5 h-10 w-full rounded-md border px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium" htmlFor="categoryId">
            Category
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={category?.success ? category.data : ""}
              className="mt-1.5 h-10 w-full rounded-md border bg-white px-3 text-sm"
            >
              <option value="">All categories</option>
              {options.categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nameEn}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-10 self-end rounded-md border px-4 text-sm font-medium"
          >
            Apply filters
          </button>
        </form>
        <ProductList initialProducts={products} />
      </section>
    </main>
  );
}
