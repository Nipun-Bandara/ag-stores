import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import {
  getDictionary,
  localizeBilingual,
  routePath,
  type Locale,
} from "@/lib/i18n/config";
import type { StorefrontProductView } from "@/services/storefront.service";
import { CompactProductPrice } from "./compact-product-price";

/** Compact vertical card for horizontally scrolling product rows. */
export function ProductTile({
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
    <article
      data-testid="product-tile"
      className="flex w-36 shrink-0 snap-start flex-col sm:w-44"
    >
      <div className="relative">
        <Link
          href={href}
          aria-label={`${copy.viewProduct}: ${name}`}
          className="block overflow-hidden rounded-xl"
        >
          <ImageWithFallback
            src={product.imageUrl}
            alt={name}
            fallback={copy.noImage}
            sizes="(min-width: 640px) 176px, 144px"
            className="aspect-square w-full rounded-xl text-xs"
          />
        </Link>
        <div className="absolute bottom-2 right-2 rounded-lg bg-background shadow-sm">
          <AddToCartButton
            compact
            locale={locale}
            localizedRoute={localizedRoute}
            product={cartProduct}
          />
        </div>
      </div>
      {/* Fixed slots (two-line name, two-line price, badge at the bottom)
          keep every tile in a row the same height. */}
      <div className="flex flex-1 flex-col">
        <h3 className="mt-2 line-clamp-2 min-h-[2lh] break-words text-sm font-medium leading-snug">
          <Link
            href={href}
            className="text-foreground no-underline hover:text-primary"
          >
            {name}
          </Link>
        </h3>
        <div className="mb-2 mt-1 min-h-10">
          <CompactProductPrice product={cartProduct} locale={locale} />
        </div>
        <Badge
          variant={product.isOutOfStock ? "destructive" : "success"}
          className="mt-auto self-start"
        >
          {product.isOutOfStock ? copy.outOfStock : copy.inStock}
        </Badge>
      </div>
    </article>
  );
}
