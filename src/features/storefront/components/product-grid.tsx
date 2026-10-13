import { ProductCard } from "@/features/storefront/components/product-card";
import type { Locale } from "@/lib/i18n/config";
import type { StorefrontProductView } from "@/services/storefront.service";
import { Card } from "@/components/ui/card";

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
      <Card className="gap-0 border-dashed p-10 text-center text-muted-foreground border ring-0">
        {emptyMessage}
      </Card>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
