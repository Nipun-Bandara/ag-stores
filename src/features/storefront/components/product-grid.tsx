import { ProductCard } from "@/features/storefront/components/product-card";
import type { Locale } from "@/lib/i18n/config";
import type { StorefrontProductView } from "@/services/storefront.service";

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
      <div className="rounded-2xl border border-dashed border-emerald-950/20 bg-white p-10 text-center text-sm text-neutral-600">
        {emptyMessage}
      </div>
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
