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
    <div className="@container/catalogue">
      <div className="grid gap-x-6 @min-[40rem]/catalogue:grid-cols-2 @min-[70rem]/catalogue:grid-cols-3 @min-[70rem]/catalogue:gap-x-8">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            locale={locale}
            localizedRoute={localizedRoute}
          />
        ))}
      </div>
    </div>
  );
}
