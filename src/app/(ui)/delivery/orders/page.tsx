import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { AvailableOrderBatchSelector } from "@/features/delivery/components/available-order-batch-selector";
import { requireRole } from "@/lib/auth/server";
import { listAvailableDeliveryOrders } from "@/services/delivery-order.service";
import { availableDeliveryOrderFiltersSchema } from "@/validations/delivery-order";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Available orders | AG Stores" };

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
        Available orders
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ready orders from {data.shop.name} that have not yet been assigned.
      </p>

      <Card className="gap-0 mt-8 p-5">
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Label className="text-sm font-medium" htmlFor="maxDistanceKm">
            Maximum approximate distance
            <Input
              id="maxDistanceKm"
              name="maxDistanceKm"
              type="number"
              min="0.1"
              max="500"
              step="0.1"
              defaultValue={filters.maxDistanceKm ?? ""}
              placeholder="Kilometres"
              className="mt-1.5 h-10 w-full"
            />
          </Label>
          <Label className="text-sm font-medium" htmlFor="createdAfter">
            Created after
            <Input
              id="createdAfter"
              name="createdAfter"
              type="date"
              defaultValue={filters.createdAfter ?? ""}
              className="mt-1.5 h-10 w-full"
            />
          </Label>
          <Label className="text-sm font-medium" htmlFor="sortBy">
            Sort by
            <NativeSelect
              id="sortBy"
              name="sortBy"
              defaultValue={filters.sortBy}
              className="mt-1.5 h-10 w-full"
            >
              <NativeSelectOption value="createdAt">
                Creation time
              </NativeSelectOption>
              <NativeSelectOption value="distance">
                Approximate distance
              </NativeSelectOption>
            </NativeSelect>
          </Label>
          <Label className="text-sm font-medium" htmlFor="direction">
            Direction
            <NativeSelect
              id="direction"
              name="direction"
              defaultValue={filters.direction}
              className="mt-1.5 h-10 w-full"
            >
              <NativeSelectOption value="asc">Ascending</NativeSelectOption>
              <NativeSelectOption value="desc">Descending</NativeSelectOption>
            </NativeSelect>
          </Label>
          <div className="flex items-end gap-2">
            <Button type="submit" className="h-10">
              Apply
            </Button>
            <Link
              href="/delivery/orders"
              className={buttonVariants({
                variant: "outline",
                className: "inline-flex h-10 items-center",
              })}
            >
              Clear
            </Link>
          </div>
        </form>
      </Card>
      {!parsed.success ? (
        <Alert variant="destructive" role="alert" className="mt-3">
          One or more filters were invalid and have been cleared.
        </Alert>
      ) : null}

      <AvailableOrderBatchSelector
        orders={data.orders}
        suggestedGroups={data.suggestedGroups}
      />
    </section>
  );
}
