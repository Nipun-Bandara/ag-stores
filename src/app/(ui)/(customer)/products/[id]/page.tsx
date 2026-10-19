import { getServerText } from "@/lib/i18n/server";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

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
    <section className="min-w-0 w-full">
      <Link
        href={routePath(
          `/categories/${product.categoryId}`,
          locale,
          localizedRoute,
        )}
        className={buttonVariants({
          variant: "ghost",
          className: "-ml-3 max-w-full whitespace-normal break-words",
        })}
      >
        {categoryName}
      </Link>
      <div className="mt-6 grid min-w-0 gap-8 lg:grid-cols-2 lg:gap-14">
        <Card className="gap-0 overflow-hidden rounded-[2rem] py-0 shadow-sm">
          <ImageWithFallback
            src={product.imageUrl}
            alt={name}
            fallback={copy.noImage}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-square w-full"
          />
        </Card>
        <section className="min-w-0 self-center">
          <p className="break-words text-sm font-medium text-muted-foreground">
            {product.shopName}
          </p>
          <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {name}
          </h1>
          <p className="mt-7 text-3xl font-black text-foreground">
            LKR {product.price}
          </p>
          <div className="mt-5">
            <Badge variant={product.isOutOfStock ? "destructive" : "success"}>
              {product.isOutOfStock
                ? copy.outOfStock
                : `${product.stockQuantity} ${copy.inStockCount}`}
            </Badge>
          </div>
          {description ? (
            <p className="mt-8 break-words leading-7 text-muted-foreground">
              {description}
            </p>
          ) : null}
          <div className="mt-10">
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
              className="h-10 px-6"
            />
          </div>
        </section>
      </div>
    </section>
  );
}
