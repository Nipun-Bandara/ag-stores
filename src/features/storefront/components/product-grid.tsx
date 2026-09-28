import { ProductCard } from "@/features/storefront/components/product-card";
import type { StorefrontLocale } from "@/lib/i18n/storefront";
import type { StorefrontProductView } from "@/services/storefront.service";

export function ProductGrid({
  products,
  locale = "en",
  emptyMessage = "No products match your selection.",
}: {
  products: StorefrontProductView[];
  locale?: StorefrontLocale;
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
        <ProductCard key={product.id} product={product} locale={locale} />
      ))}
    </div>
  );
}
