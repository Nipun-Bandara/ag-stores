import { requireRole } from "@/lib/auth/server";
import {
  StocksPage,
  type StockQuery,
} from "@/features/stocks/components/stocks-page";

export default async function OwnerStocksPage({
  searchParams,
}: {
  searchParams: StockQuery;
}) {
  const user = await requireRole("SHOP_OWNER", "/owner/stocks");
  return <StocksPage user={user} searchParams={searchParams} />;
}
