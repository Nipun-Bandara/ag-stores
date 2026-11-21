import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { parseProductPage } from "@/lib/product-pagination";
import { getStorefrontProductPage } from "@/services/storefront.service";
import {
  productCategoryFilterSchema,
  productSearchSchema,
} from "@/validations/product";

/**
 * Public, read-only catalogue page used by the phone storefront to load more
 * products as the shopper scrolls. Accepts the same query parameters as the
 * /products and /categories/[id] pages: search, categoryId, page, pageSize.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const searchValue = query.get("search");
  const categoryValue = query.get("categoryId");
  const search = searchValue
    ? productSearchSchema.safeParse(searchValue)
    : null;
  const category = categoryValue
    ? productCategoryFilterSchema.safeParse(categoryValue)
    : null;
  if (search?.success === false || category?.success === false) {
    return errorResponse(
      { code: "VALIDATION_ERROR", message: "Product filters are invalid." },
      400,
    );
  }

  try {
    const page = await getStorefrontProductPage(
      {
        ...(search?.data ? { search: search.data } : {}),
        ...(category?.data ? { categoryId: category.data } : {}),
      },
      parseProductPage({
        page: query.get("page") ?? undefined,
        pageSize: query.get("pageSize") ?? undefined,
      }),
    );
    return successResponse(page);
  } catch (error) {
    console.error("Unable to load storefront products.", error);
    return errorResponse(
      { code: "INTERNAL_ERROR", message: "Unable to load products." },
      500,
    );
  }
}
