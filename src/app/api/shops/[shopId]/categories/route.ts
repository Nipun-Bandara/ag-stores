import { successResponse } from "@/lib/api-response";
import { categoryErrorResponse } from "@/lib/category-http";
import { listStorefrontCategories } from "@/services/category.service";
import { categoryShopIdSchema } from "@/validations/category";

type ShopContext = { params: Promise<{ shopId: string }> };

export async function GET(_request: Request, context: ShopContext) {
  const shopId = categoryShopIdSchema.safeParse((await context.params).shopId);
  if (!shopId.success) {
    return successResponse([]);
  }

  try {
    return successResponse(await listStorefrontCategories(shopId.data));
  } catch (error) {
    return categoryErrorResponse(error);
  }
}
