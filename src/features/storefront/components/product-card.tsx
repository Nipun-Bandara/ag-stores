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
  const backgroundStyle = product.imageUrl
    ? { backgroundImage: `url(${JSON.stringify(product.imageUrl)})` }
    : undefined;

  return (
    <Card
      as="article"
      className="gap-0 overflow-hidden py-0"
      data-testid="product-card"
    >
      <div
        className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-amber-100 via-orange-50 to-lime-100 bg-cover bg-center text-5xl font-black text-emerald-900/25"
        style={backgroundStyle}
        role={product.imageUrl ? "img" : undefined}
        aria-label={product.imageUrl ? name : undefined}
      >
        {!product.imageUrl ? name.charAt(0).toUpperCase() : null}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-emerald-700 uppercase">
              {localizeBilingual(
                product.categoryNameEn,
                product.categoryNameSi,
                locale,
              )}
            </p>
            <h3 className="mt-1 text-lg font-bold text-foreground">{name}</h3>
          </div>
          <p className="shrink-0 font-black text-foreground">
            LKR {product.price}
          </p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{product.shopName}</p>
        <div className="mt-5 flex items-start justify-between gap-3">
          <Badge variant={product.isOutOfStock ? "destructive" : "success"}>
            {product.isOutOfStock ? copy.outOfStock : copy.inStock}
          </Badge>
          <div className="flex flex-col items-end gap-2">
            <Link
              href={routePath(
                `/products/${product.id}`,
                locale,
                localizedRoute,
              )}
              className="text-sm font-bold text-emerald-800 underline decoration-emerald-300 underline-offset-4"
            >
              {copy.viewProduct}
            </Link>
            <AddToCartButton
              locale={locale}
              product={{
                id: product.id,
                name,
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
