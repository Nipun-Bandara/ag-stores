import { isGtinCandidate } from "@/lib/barcode";

export type ImageCandidate = {
  provider: "open-food-facts";
  sourceBarcode: string;
  productName: string;
  brand: string | null;
  packageQuantity: string | null;
  imageUrl: string;
  sourcePageUrl: string;
  attribution: string;
  licenseUrl: string;
};

export interface ProductImageProvider {
  lookup(barcode: string): Promise<ImageCandidate | null>;
}

type ProductData = Record<string, unknown>;
const API_ORIGIN = "https://world.openfoodfacts.org";
const IMAGE_ORIGIN = "https://images.openfoodfacts.org";
export const AWS_IMAGE_ORIGIN =
  "https://openfoodfacts-images.s3.eu-west-3.amazonaws.com";

/** Only normalize lookup keys, never the barcode stored in our product database. */
export function gtinKey(code: string): string {
  return code.trim().padStart(14, "0");
}

export function candidateFromProduct(
  requestedBarcode: string,
  product: ProductData,
): ImageCandidate | null {
  const code = String(product.code ?? "");
  if (!isGtinCandidate(code) || gtinKey(code) !== gtinKey(requestedBarcode))
    return null;
  let rawUrl = product.image_front_url;
  if (typeof rawUrl !== "string" || !rawUrl) {
    // Bulk exports may carry image metadata instead of API-computed image URLs.
    const images = product.images as
      | Record<
          string,
          { rev?: string | number; sizes?: Record<string, unknown> }
        >
      | undefined;
    const key =
      images &&
      (images.front_en
        ? "front_en"
        : Object.keys(images).find((k) => /^front_[a-z]{2}$/.test(k)));
    const image = key ? images?.[key] : undefined;
    if (
      key &&
      image &&
      /^\d+$/.test(String(image.rev)) &&
      image.sizes?.["400"]
    ) {
      const padded = code.length > 8 ? code.padStart(13, "0") : code;
      const folder =
        padded.length > 8
          ? padded.replace(/^(...)(...)(...)(.*)$/, "$1/$2/$3/$4")
          : padded;
      rawUrl = `${IMAGE_ORIGIN}/images/products/${folder}/${key}.${image.rev}.400.jpg`;
    }
  }
  if (typeof rawUrl !== "string" || !rawUrl) return null;
  const url = new URL(rawUrl);
  if (
    url.origin !== IMAGE_ORIGIN ||
    !url.pathname.startsWith("/images/products/")
  )
    return null;
  // Official AWS mirror uses the same image path beneath /data. No fallback crawling.
  const imageUrl = `${AWS_IMAGE_ORIGIN}/data/${url.pathname.slice("/images/products/".length)}`;
  const text = (field: string) =>
    typeof product[field] === "string" ? (product[field] as string) : null;
  return {
    provider: "open-food-facts",
    sourceBarcode: code,
    productName: text("product_name") ?? text("product_name_en") ?? "",
    brand: text("brands"),
    packageQuantity: text("quantity"),
    imageUrl,
    sourcePageUrl: `${API_ORIGIN}/product/${encodeURIComponent(code)}`,
    attribution:
      "Open Food Facts contributors; image converted to WebP and resized by AG Stores",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  };
}

export class OpenFoodFactsProvider implements ProductImageProvider {
  private nextRequestAt = 0;
  constructor(private readonly userAgent: string) {
    if (!/^[^\s]+\/[^\s]+\s+\(.+@.+\)$/.test(userAgent)) {
      throw new Error(
        "Set OPEN_FOOD_FACTS_USER_AGENT to AGStores/1.0 (your-contact@email).",
      );
    }
  }

  async lookup(barcode: string): Promise<ImageCandidate | null> {
    if (!isGtinCandidate(barcode)) return null;
    // Sequential requests, including retries, stay below the documented read limit.
    for (let attempt = 0; attempt < 3; attempt++) {
      const delay = Math.max(0, this.nextRequestAt - Date.now());
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      this.nextRequestAt = Date.now() + 5000;
      const url = new URL(
        `/api/v3.6/product/${encodeURIComponent(barcode)}.json`,
        API_ORIGIN,
      );
      url.searchParams.set(
        "fields",
        "code,product_name,product_name_en,brands,quantity,image_front_url",
      );
      const response = await fetch(url, {
        headers: { "User-Agent": this.userAgent },
        signal: AbortSignal.timeout(20000),
        redirect: "error",
      });
      if (response.status === 404) return null;
      if (response.status === 429 || response.status >= 500) {
        await response.body?.cancel();
        if (attempt < 2) {
          this.nextRequestAt = Date.now() + 10000 * (attempt + 1);
          continue;
        }
      }
      if (!response.ok)
        throw new Error(
          `Open Food Facts lookup failed (HTTP ${response.status}).`,
        );
      const body = (await response.json()) as { product?: ProductData };
      return body.product ? candidateFromProduct(barcode, body.product) : null;
    }
    return null;
  }
}
