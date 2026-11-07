import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { ProductList } from "@/features/owner/components/product-list";
import { ProductFilters } from "@/features/owner/components/product-filters";
import { requireRole } from "@/lib/auth/server";
import {
  getProductFormOptions,
  listOwnerProducts,
} from "@/services/product.service";
import {
  productCategoryFilterSchema,
  productInventoryStatusSchema,
  productSearchSchema,
} from "@/validations/product";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Products")} | AG Stores` };
}

interface ProductsPageProps {
  searchParams: Promise<{
    categoryId?: string | string[];
    search?: string | string[];
    inventoryStatus?: string | string[];
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
  const inventoryValue = Array.isArray(query.inventoryStatus)
    ? query.inventoryStatus[0]
    : query.inventoryStatus;
  const category = categoryValue
    ? productCategoryFilterSchema.safeParse(categoryValue)
    : undefined;
  const search = searchValue
    ? productSearchSchema.safeParse(searchValue)
    : undefined;
  const inventory = inventoryValue
    ? productInventoryStatusSchema.safeParse(inventoryValue)
    : undefined;
  const filters = {
    ...(category?.success ? { categoryId: category.data } : {}),
    ...(search?.success && search.data ? { search: search.data } : {}),
    ...(inventory?.success ? { inventoryStatus: inventory.data } : {}),
  };
  const [products, options] = await Promise.all([
    listOwnerProducts(user, filters),
    getProductFormOptions(user),
  ]);

  return (
    <section className="min-w-0 w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <Text value={"Products"} />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <Text
              value={
                "Manage product details, availability, prices, and stock. "
              }
            />
          </p>
        </div>
        <Link
          href="/owner/products/new"
          className={buttonVariants({ variant: "default", className: "" })}
        >
          <Text value={"Add product "} />
        </Link>
      </div>
      <Card className="gap-0 mt-8 p-5">
        <ProductFilters
          categories={options.categories}
          initialSearch={search?.success ? search.data : ""}
          initialCategoryId={category?.success ? category.data : ""}
          initialInventoryStatus={inventory?.success ? inventory.data : ""}
        />
      </Card>
      <ProductList key={JSON.stringify(filters)} initialProducts={products} />
    </section>
  );
}
