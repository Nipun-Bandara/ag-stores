import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { ProductForm } from "@/features/owner/components/product-form";
import { requireRole } from "@/lib/auth/server";
import { getProductFormOptions } from "@/services/product.service";

export const metadata: Metadata = { title: "New product | AG Stores" };

export default async function NewProductPage() {
  const user = await requireRole(UserRole.SHOP_OWNER, "/owner/products/new");
  const options = await getProductFormOptions(user);

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">Add product</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create a product for one of your shops.
      </p>
      <ProductForm options={options} />
    </section>
  );
}
