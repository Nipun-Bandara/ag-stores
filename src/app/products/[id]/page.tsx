import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { StorefrontFooter } from "@/features/storefront/components/storefront-footer";
import { StorefrontHeader } from "@/features/storefront/components/storefront-header";
import { getDictionary, localizeBilingual, routePath } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";
import { getStorefrontProduct } from "@/services/storefront.service";
import { productIdSchema } from "@/validations/product";

export const metadata: Metadata = { title: "Product | AG Stores" };

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

  const backgroundStyle = product.imageUrl
    ? { backgroundImage: `url(${JSON.stringify(product.imageUrl)})` }
    : undefined;

  return (
    <div className="min-h-screen bg-[#fffdf7]">
      <StorefrontHeader locale={locale} localizedRoute={localizedRoute} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <Link
          href={routePath(
            `/categories/${product.categoryId}`,
            locale,
            localizedRoute,
          )}
          className="text-sm font-bold text-emerald-700"
        >
          ← {categoryName}
        </Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div
            className="flex aspect-square items-center justify-center rounded-[2rem] bg-gradient-to-br from-amber-100 via-orange-50 to-lime-100 bg-cover bg-center text-8xl font-black text-emerald-900/20 shadow-sm"
            style={backgroundStyle}
            role={product.imageUrl ? "img" : undefined}
            aria-label={product.imageUrl ? name : undefined}
          >
            {!product.imageUrl ? name.charAt(0).toUpperCase() : null}
          </div>
          <section className="self-center">
            <p className="text-sm font-black tracking-wide text-emerald-700 uppercase">
              {product.shopName}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-emerald-950 sm:text-5xl">
              {name}
            </h1>
            <p className="mt-7 text-3xl font-black text-emerald-950">
              LKR {product.price}
            </p>
            <div className="mt-5">
              <span
                className={
                  product.isOutOfStock
                    ? "inline-flex rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700"
                    : "inline-flex rounded-full bg-lime-100 px-4 py-2 text-sm font-bold text-emerald-800"
                }
              >
                {product.isOutOfStock
                  ? copy.outOfStock
                  : `${product.stockQuantity} ${copy.inStockCount}`}
              </span>
            </div>
            {description ? (
              <p className="mt-8 leading-7 text-neutral-600">{description}</p>
            ) : null}
            <div className="mt-10">
              <AddToCartButton
                locale={locale}
                product={{
                  id: product.id,
                  name,
                  price: product.price,
                  stockQuantity: product.stockQuantity,
                  imageUrl: product.imageUrl,
                }}
                className="rounded-xl bg-emerald-950 px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
              />
            </div>
          </section>
        </div>
      </main>
      <StorefrontFooter locale={locale} />
    </div>
  );
}
