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
      <ImageWithFallback
        src={product.imageUrl}
        alt={name}
        fallback={copy.noImage}
        className="aspect-[4/3] w-full"
      />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-xs font-bold tracking-wide text-emerald-700 uppercase">
              {localizeBilingual(
                product.categoryNameEn,
                product.categoryNameSi,
                locale,
              )}
            </p>
            <h3 className="mt-1 break-words text-lg font-bold text-foreground">
              {name}
            </h3>
          </div>
          <p className="shrink-0 font-black text-foreground">
            LKR {product.price}
          </p>
        </div>
        <p className="mt-2 break-words text-xs text-muted-foreground">
          {product.shopName}
        </p>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
          <Badge variant={product.isOutOfStock ? "destructive" : "success"}>
            {product.isOutOfStock ? copy.outOfStock : copy.inStock}
          </Badge>
          <div className="flex min-w-0 flex-col items-end gap-2">
            <Link
              href={routePath(
                `/products/${product.id}`,
                locale,
                localizedRoute,
              )}
              className="break-words text-right text-sm font-bold text-emerald-800 underline decoration-emerald-300 underline-offset-4"
            >
              {copy.viewProduct}
            </Link>
            <AddToCartButton
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
      </div>
    </Card>
  );
}
