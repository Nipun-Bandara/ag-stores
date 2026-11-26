import { requireRole } from "@/lib/auth/server";
import {
  StocksPage,
  type StockQuery,
} from "@/features/stocks/components/stocks-page";

export default async function AdminStocksPage({
  searchParams,
}: {
  searchParams: StockQuery;
}) {
  const user = await requireRole("ADMIN", "/admin/stocks");
  return <StocksPage user={user} searchParams={searchParams} />;
}
