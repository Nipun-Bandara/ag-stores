export const PRODUCT_PAGE_SIZES = [12, 24, 48] as const;
export const DEFAULT_PRODUCT_PAGE_SIZE = 24;
export interface ProductPageRequest {
  page: number;
  pageSize: number;
}
export interface ProductPageInfo extends ProductPageRequest {
  total: number;
  pageCount: number;
}
export function parseProductPage(query: {
  page?: unknown;
  pageSize?: unknown;
}): ProductPageRequest {
  const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
  const pageValue = first(query.page);
  const page =
    typeof pageValue === "string" && /^\d{1,6}$/.test(pageValue)
      ? Number(pageValue)
      : 1;
  const size = Number(first(query.pageSize));
  return {
    page: Math.max(1, Math.min(100000, page)),
    pageSize: PRODUCT_PAGE_SIZES.includes(size as 12 | 24 | 48)
      ? size
      : DEFAULT_PRODUCT_PAGE_SIZE,
  };
}
export function productPageInfo(
  total: number,
  request: ProductPageRequest,
): ProductPageInfo {
  const pageSize = PRODUCT_PAGE_SIZES.includes(request.pageSize as 12 | 24 | 48)
    ? request.pageSize
    : DEFAULT_PRODUCT_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const requestedPage =
    Number.isSafeInteger(request.page) && request.page > 0 ? request.page : 1;
  return {
    pageSize,
    page: Math.min(requestedPage, pageCount),
    total,
    pageCount,
  };
}
