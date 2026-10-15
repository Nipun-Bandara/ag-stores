import { BilingualText } from "@/features/i18n/components/bilingual-text";
import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { ProductList } from "@/features/owner/components/product-list";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Button, buttonVariants } from "@/components/ui/button";
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
  const t = await getServerText();
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
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <Label className="text-sm font-medium" htmlFor="search">
            <Text value={"Search "} />
            <Input
              id="search"
              name="search"
              defaultValue={search?.success ? search.data : ""}
              placeholder={t("Name or description")}
              className="mt-1.5 h-10 w-full"
            />
          </Label>
          <Label className="text-sm font-medium" htmlFor="categoryId">
            <Text value={"Category "} />
            <NativeSelect
              id="categoryId"
              name="categoryId"
              defaultValue={category?.success ? category.data : ""}
              className="mt-1.5 h-10 w-full"
            >
              <NativeSelectOption value="">
                <Text value={"All categories"} />
              </NativeSelectOption>
              {options.categories.map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  <BilingualText english={item.nameEn} sinhala={item.nameSi} />
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Label>
          <Label className="text-sm font-medium" htmlFor="inventoryStatus">
            <Text value={"Inventory "} />
            <NativeSelect
              id="inventoryStatus"
              name="inventoryStatus"
              defaultValue={inventory?.success ? inventory.data : ""}
              className="mt-1.5 h-10 w-full"
            >
              <NativeSelectOption value="">
                <Text value={"All stock levels"} />
              </NativeSelectOption>
              <NativeSelectOption value="OUT_OF_STOCK">
                <Text value={"Out of stock "} />
              </NativeSelectOption>
              <NativeSelectOption value="LOW_STOCK">
                <Text value={"Low stock "} />
              </NativeSelectOption>
              <NativeSelectOption value="AVAILABLE">
                <Text value={"Available "} />
              </NativeSelectOption>
            </NativeSelect>
          </Label>
          <Button variant="outline" type="submit" className="h-10 self-end">
            <Text value={"Apply filters "} />
          </Button>
        </form>
      </Card>
      <ProductList initialProducts={products} />
    </section>
  );
}
