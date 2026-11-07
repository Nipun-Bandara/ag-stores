import { BackLink } from "@/components/ui/back-link";
import { CataloguePricing } from "@/features/pricing/catalogue-pricing";
import { getServerText } from "@/lib/i18n/server";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { translate } from "@/lib/i18n/text";

import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { Card } from "@/components/ui/card";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { buttonVariants } from "@/components/ui/button";
import { getDictionary, localizeBilingual, routePath } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";
import { getStorefrontProduct } from "@/services/storefront.service";
import { productIdSchema } from "@/validations/product";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Product")} | AG Stores` };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const productId = productIdSchema.safeParse((await params).id);
  if (!productId.success) notFound();
  const [localeContext, product] = await Promise.all([
    getLocaleContext(),
    getStorefrontProduct(productId.data),
  ]);
  if (!product) notFound();
  const { locale, localizedRoute } = localeContext;
  const copy = getDictionary(locale).storefront;
  const name = localizeBilingual(product.nameEn, product.nameSi, locale);
  const description = localizeBilingual(
    product.descriptionEn ?? "",
    product.descriptionSi,
    locale,
  );
  const categoryName = localizeBilingual(
    product.categoryNameEn,
    product.categoryNameSi,
    locale,
  );

  return (
    <section className="min-w-0 w-full max-w-5xl">
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
        <BackLink
          href={routePath("/products", locale, localizedRoute)}
          className="max-w-[55%]"
        >
          {translate(locale, "Back to products")}
        </BackLink>
        <Link
          href={routePath(
            `/categories/${product.categoryId}`,
            locale,
            localizedRoute,
          )}
          className={cn(
            buttonVariants({
              variant: "outline",
              className:
                "ml-auto h-auto min-h-9 min-w-0 max-w-[45%] justify-start whitespace-normal break-words px-3 py-2 no-underline",
            }),
          )}
        >
          {categoryName}
          <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
        </Link>
      </div>
      <div className="mt-4 grid min-w-0 items-start gap-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <Card className="mx-auto w-40 gap-0 overflow-hidden rounded-xl border border-border py-0 shadow-none ring-0 sm:mx-0 sm:w-48 lg:w-56">
          <ImageWithFallback
            src={product.imageUrl}
            alt={name}
            fallback={copy.noImage}
            sizes="(min-width: 1024px) 224px, (min-width: 640px) 192px, 160px"
            className="aspect-square w-full"
          />
        </Card>
        <section className="min-w-0">
          <p className="break-words text-sm font-medium text-muted-foreground">
            {product.shopName}
          </p>
          <h1 className="mt-2 break-words text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">
            {name}
          </h1>
          <div className="mt-3">
            <Badge variant={product.isOutOfStock ? "destructive" : "success"}>
              {product.isOutOfStock ? copy.outOfStock : copy.inStock}
            </Badge>
          </div>
          <div className="mt-5 border-y border-border py-4 [&_p]:leading-6 [&_ul]:mt-2 [&_li]:py-1">
            <CataloguePricing product={{ ...product, name }} locale={locale} />
          </div>
          {description ? (
            <p className="mt-5 whitespace-pre-line break-words text-sm leading-7 text-muted-foreground">
              {description}
            </p>
          ) : null}
          <div className="mt-6">
            <AddToCartButton
              locale={locale}
              localizedRoute={localizedRoute}
              product={{
                id: product.id,
                name,
                nameEn: product.nameEn,
                nameSi: product.nameSi,
                price: product.price,
                discountTiers: product.discountTiers,
                sellingUnit: product.sellingUnit,
                minimumOrderQuantity: product.minimumOrderQuantity,
                orderingIncrement: product.orderingIncrement,
                stockQuantity: product.stockQuantity,
                imageUrl: product.imageUrl,
              }}
              className="h-10 px-6"
            />
          </div>
        </section>
      </div>
    </section>
  );
}
