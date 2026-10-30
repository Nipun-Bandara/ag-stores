import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { AvailableOrderBatchSelector } from "@/features/delivery/components/available-order-batch-selector";
import { AvailableOrdersFilters } from "@/features/delivery/components/available-orders-filters";
import { requireRole } from "@/lib/auth/server";
import { listAvailableDeliveryOrders } from "@/services/delivery-order.service";
import { availableDeliveryOrderFiltersSchema } from "@/validations/delivery-order";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Available orders")} | AG Stores` };
}

interface DeliveryOrdersPageProps {
  searchParams: Promise<{
    sortBy?: string | string[];
    direction?: string | string[];
    maxDistanceKm?: string | string[];
    createdAfter?: string | string[];
  }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DeliveryOrdersPage({
  searchParams,
}: DeliveryOrdersPageProps) {
  const user = await requireRole(UserRole.DELIVERY_PERSON, "/delivery/orders");
  const query = await searchParams;
  const rawFilters = Object.fromEntries(
    Object.entries(query).flatMap(([key, value]) => {
      const selected = first(value);
      return selected ? [[key, selected]] : [];
    }),
  );
  const parsed = availableDeliveryOrderFiltersSchema.safeParse(rawFilters);
  const filters = parsed.success
    ? parsed.data
    : availableDeliveryOrderFiltersSchema.parse({});
  const data = await listAvailableDeliveryOrders(user, filters);

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value={"Available orders "} />
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text value={"Ready orders from "} />
        {data.shop.name} <Text value={"that have not yet been assigned. "} />
      </p>

      <Card className="gap-0 mt-8 p-5">
        <AvailableOrdersFilters
          key={`${filters.maxDistanceKm ?? ""}:${filters.createdAfter ?? ""}:${filters.sortBy}:${filters.direction}`}
          initialMaxDistanceKm={filters.maxDistanceKm}
          initialCreatedAfter={filters.createdAfter}
          initialSortBy={filters.sortBy}
          initialDirection={filters.direction}
        />
      </Card>
      {!parsed.success ? (
        <Alert variant="destructive" role="alert" className="mt-3">
          <Text
            value={"One or more filters were invalid and have been cleared. "}
          />
        </Alert>
      ) : null}

      <AvailableOrderBatchSelector
        orders={data.orders}
        suggestedGroups={data.suggestedGroups}
      />
    </section>
  );
}
