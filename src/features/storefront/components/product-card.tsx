import Link from "next/link";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { CompactProductPrice } from "./compact-product-price";
import {
  getDictionary,
  localizeBilingual,
  routePath,
  type Locale,
} from "@/lib/i18n/config";
import type { StorefrontProductView } from "@/services/storefront.service";
import { Card } from "@/components/ui/card";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

export function ProductCard({
  product,
  locale = "en",
  localizedRoute = false,
}: {
  product: StorefrontProductView;
  locale?: Locale;
  localizedRoute?: boolean;
}) {
  const copy = getDictionary(locale).storefront;
  const name = localizeBilingual(product.nameEn, product.nameSi, locale);
  const href = routePath(`/products/${product.id}`, locale, localizedRoute);
  const cartProduct = { ...product, name };
  return (
    <Card
      as="article"
      className="min-w-0 flex-row items-start justify-between gap-4 rounded-none border-b border-border bg-transparent px-0 py-5 shadow-none ring-0"
      data-testid="product-card"
    >
      <div className="min-w-0 flex-1 py-1">
        <h3 className="break-words text-base font-semibold leading-snug">
          <Link
            href={href}
            className="text-foreground no-underline hover:text-primary"
            title={copy.viewProduct}
          >
            {name}
          </Link>
        </h3>
        <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
          {localizeBilingual(
            product.categoryNameEn,
            product.categoryNameSi,
            locale,
          )}
        </p>
        <div className="mt-3">
          <CompactProductPrice product={cartProduct} locale={locale} />
        </div>
        {product.isOutOfStock ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {copy.outOfStock}
          </p>
        ) : null}
      </div>
      <div className="relative mb-3 w-28 shrink-0">
        <Link
          href={href}
          aria-label={`${copy.viewProduct}: ${name}`}
          className="block overflow-hidden rounded-xl"
        >
          <ImageWithFallback
            src={product.imageUrl}
            alt={name}
            fallback={copy.noImage}
            sizes="112px"
            className="size-28 rounded-xl text-xs"
          />
        </Link>
        <div className="absolute -bottom-3 right-0 max-w-full rounded-lg bg-background shadow-sm">
          <AddToCartButton
            compact
            locale={locale}
            localizedRoute={localizedRoute}
            product={cartProduct}
          />
        </div>
      </div>
    </Card>
  );
}
