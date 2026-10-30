import { Badge } from "@/components/ui/badge";
import Link from "next/link";

import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
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

  return (
    <Card
      as="article"
      className="gap-0 overflow-hidden py-0"
      data-testid="product-card"
    >
      <div className="relative">
        <ImageWithFallback
          src={product.imageUrl}
          alt={name}
          fallback={copy.noImage}
          className="aspect-[16/10] w-full"
        />
        <Badge
          variant={product.isOutOfStock ? "destructive" : "success"}
          className="absolute left-3 top-3"
        >
          {product.isOutOfStock ? copy.outOfStock : copy.inStock}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <p className="break-words text-xs font-medium text-muted-foreground">
            {localizeBilingual(
              product.categoryNameEn,
              product.categoryNameSi,
              locale,
            )}
          </p>
          <h3 className="mt-1 break-words text-base font-semibold leading-snug">
            <Link
              href={routePath(
                `/products/${product.id}`,
                locale,
                localizedRoute,
              )}
              className="text-foreground hover:text-primary"
              title={copy.viewProduct}
            >
              {name}
            </Link>
          </h3>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            {product.shopName}
          </p>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="font-bold text-foreground">LKR {product.price}</p>
          <AddToCartButton
            compact
            locale={locale}
            product={{
              id: product.id,
              name,
              nameEn: product.nameEn,
              nameSi: product.nameSi,
              price: product.price,
              stockQuantity: product.stockQuantity,
              imageUrl: product.imageUrl,
            }}
          />
        </div>
      </div>
    </Card>
  );
}
