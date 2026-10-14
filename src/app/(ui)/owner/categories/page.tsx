import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { CategoryManager } from "@/features/owner/components/category-manager";
import { requireRole } from "@/lib/auth/server";
import { getOwnerCategoryManagement } from "@/services/category.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Categories")} | AG Stores` };
}

export default async function OwnerCategoriesPage() {
  const user = await requireRole(UserRole.SHOP_OWNER, "/owner/categories");
  const data = await getOwnerCategoryManagement(user);

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value={"Product categories "} />
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text
          value={"Organize each shop's products in English and Sinhala. "}
        />
      </p>
      <CategoryManager initialData={data} />
    </section>
  );
}
