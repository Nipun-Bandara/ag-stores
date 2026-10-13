import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { CategoryManager } from "@/features/owner/components/category-manager";
import { requireRole } from "@/lib/auth/server";
import { getOwnerCategoryManagement } from "@/services/category.service";

export const metadata: Metadata = { title: "Categories | AG Stores" };

export default async function OwnerCategoriesPage() {
  const user = await requireRole(UserRole.SHOP_OWNER, "/owner/categories");
  const data = await getOwnerCategoryManagement(user);

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">
        Product categories
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Organize each shop&apos;s products in English and Sinhala.
      </p>
      <CategoryManager initialData={data} />
    </section>
  );
}
