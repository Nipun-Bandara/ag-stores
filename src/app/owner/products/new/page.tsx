import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { ProductForm } from "@/features/owner/components/product-form";
import { requireRole } from "@/lib/auth/server";
import { getProductFormOptions } from "@/services/product.service";

export const metadata: Metadata = { title: "New product | AG Stores" };

export default async function NewProductPage() {
  const user = await requireRole(UserRole.SHOP_OWNER, "/owner/products/new");
  const options = await getProductFormOptions(user);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <RoleAwareNavigation user={user} />
      <section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">Add product</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Create a product for one of your shops.
        </p>
        <ProductForm options={options} />
      </section>
    </main>
  );
}
