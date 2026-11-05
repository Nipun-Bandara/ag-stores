import { ProductCard } from "@/features/storefront/components/product-card";
import type { Locale } from "@/lib/i18n/config";
import type { StorefrontProductView } from "@/services/storefront.service";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export function ProductGrid({
  products,
  locale = "en",
  localizedRoute = false,
  emptyMessage = "No products match your selection.",
}: {
  products: StorefrontProductView[];
  locale?: Locale;
  localizedRoute?: boolean;
  emptyMessage?: string;
}) {
  if (products.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{emptyMessage}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          locale={locale}
          localizedRoute={localizedRoute}
        />
      ))}
    </div>
  );
}
