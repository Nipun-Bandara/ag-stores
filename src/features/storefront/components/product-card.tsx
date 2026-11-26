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
import { Badge } from "@/components/ui/badge";
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
      className="h-full min-w-0 flex-row items-stretch justify-between gap-4 rounded-none border-b border-border bg-transparent px-0 py-5 shadow-none ring-0"
      data-testid="product-card"
    >
      {/* Fixed slots (two-line name, one-line category, two-line price,
          badge at the bottom) keep every card the same height. */}
      <div className="flex min-w-0 flex-1 flex-col py-1">
        <h3 className="line-clamp-2 min-h-[2lh] break-words text-base font-semibold leading-snug">
          <Link
            href={href}
            className="text-foreground no-underline hover:text-primary"
            title={copy.viewProduct}
          >
            {name}
          </Link>
        </h3>
        <p className="mt-1 truncate text-xs leading-relaxed text-muted-foreground">
          {localizeBilingual(
            product.categoryNameEn,
            product.categoryNameSi,
            locale,
          )}
        </p>
        <div className="mb-2 mt-3 min-h-10">
          <CompactProductPrice product={cartProduct} locale={locale} />
        </div>
        <Badge
          variant={product.isOutOfStock ? "destructive" : "success"}
          className="mt-auto self-start"
        >
          {product.isOutOfStock ? copy.outOfStock : copy.inStock}
        </Badge>
      </div>
      <div className="relative mb-3 w-28 shrink-0 self-start">
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
