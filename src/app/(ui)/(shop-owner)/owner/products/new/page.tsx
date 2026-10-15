import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { ProductForm } from "@/features/owner/components/product-form";
import { requireRole } from "@/lib/auth/server";
import { getProductFormOptions } from "@/services/product.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("New product")} | AG Stores` };
}

export default async function NewProductPage() {
  const user = await requireRole(UserRole.SHOP_OWNER, "/owner/products/new");
  const options = await getProductFormOptions(user);

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value={"Add product"} />
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text value={"Create a product for one of your shops. "} />
      </p>
      <ProductForm options={options} />
    </section>
  );
}
