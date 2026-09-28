import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { StorefrontFooter } from "@/features/storefront/components/storefront-footer";
import { StorefrontHeader } from "@/features/storefront/components/storefront-header";
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
  const product = await getStorefrontProduct(productId.data);
  if (!product) notFound();

  const backgroundStyle = product.imageUrl
    ? { backgroundImage: `url(${JSON.stringify(product.imageUrl)})` }
    : undefined;

  return (
    <div className="min-h-screen bg-[#fffdf7]">
      <StorefrontHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <Link
          href={`/categories/${product.categoryId}`}
          className="text-sm font-bold text-emerald-700"
        >
          ← {product.categoryNameEn}
        </Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div
            className="flex aspect-square items-center justify-center rounded-[2rem] bg-gradient-to-br from-amber-100 via-orange-50 to-lime-100 bg-cover bg-center text-8xl font-black text-emerald-900/20 shadow-sm"
            style={backgroundStyle}
            role={product.imageUrl ? "img" : undefined}
            aria-label={product.imageUrl ? product.nameEn : undefined}
          >
            {!product.imageUrl ? product.nameEn.charAt(0).toUpperCase() : null}
          </div>
          <section className="self-center">
            <p className="text-sm font-black tracking-wide text-emerald-700 uppercase">
              {product.shopName}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-emerald-950 sm:text-5xl">
              {product.nameEn}
            </h1>
            {product.nameSi ? (
              <p className="mt-2 text-xl text-neutral-500">{product.nameSi}</p>
            ) : null}
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
                  ? "Out of Stock"
                  : `${product.stockQuantity} in stock`}
              </span>
            </div>
            {product.descriptionEn ? (
              <p className="mt-8 leading-7 text-neutral-600">
                {product.descriptionEn}
              </p>
            ) : null}
            {product.descriptionSi ? (
              <p className="mt-3 leading-7 text-neutral-500">
                {product.descriptionSi}
              </p>
            ) : null}
            <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Cart functionality will be added in a later feature.
            </div>
          </section>
        </div>
      </main>
      <StorefrontFooter />
    </div>
  );
}
