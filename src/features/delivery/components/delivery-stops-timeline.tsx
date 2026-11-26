import { Check, CircleX, MapPin, Store, Truck } from "lucide-react";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import { Badge } from "@/components/ui/badge";
import { DateText } from "@/features/i18n/components/date-text";
import { Text } from "@/features/i18n/components/text";
import { orderStatusLabels } from "@/features/orders/order-presentation";
import type { getDeliveryBatch } from "@/services/delivery-batch-management.service";

type Batch = Awaited<ReturnType<typeof getDeliveryBatch>>;
const itemClass =
  "min-w-0 group-data-[orientation=vertical]/timeline:ms-8 group-data-[orientation=vertical]/timeline:not-last:pb-4";
const separatorClass =
  "bg-border group-data-[orientation=vertical]/timeline:-left-5 group-data-[orientation=vertical]/timeline:translate-y-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.75rem)]";
const indicatorClass =
  "flex size-6 items-center justify-center border-0 group-data-[orientation=vertical]/timeline:-left-5";

export function DeliveryStopsTimeline({ batch }: { batch: Batch }) {
  const orders = [...batch.orders].sort((a, b) => a.sequence - b.sequence);
  const nextStop =
    batch.status === "IN_PROGRESS"
      ? orders.find((order) => order.status === "OUT_FOR_DELIVERY")?.id
      : undefined;

  return (
    // Stop outcomes are independent: delivering a later stop must not complete earlier stops.
    <Timeline value={0} render={<ol />} className="mt-4 w-full">
      {batch.shopLocation ? (
        <TimelineItem
          step={1}
          render={<li />}
          className={itemClass}
          aria-current={batch.status === "PENDING" ? "step" : undefined}
        >
          <TimelineHeader>
            <TimelineSeparator className={separatorClass} />
            <TimelineTitle className="break-words">
              <Text value="Shop" /> · {batch.shopLocation.name}
            </TimelineTitle>
            <TimelineIndicator
              className={`${indicatorClass} bg-primary text-primary-foreground`}
            >
              <Store className="size-3.5" aria-hidden="true" />
            </TimelineIndicator>
          </TimelineHeader>
          <TimelineContent className="mt-1 space-y-1">
            <p>
              <Text value="Starting point" />
            </p>
            <p className="break-words text-xs">
              {batch.shopLocation.latitude}, {batch.shopLocation.longitude}
            </p>
            {batch.startedAt ? (
              <TimelineDate
                dateTime={batch.startedAt}
                className="group-data-[orientation=vertical]/timeline:max-sm:h-auto"
              >
                <Text value="Delivery started." />{" "}
                <DateText value={batch.startedAt} />
              </TimelineDate>
            ) : null}
          </TimelineContent>
        </TimelineItem>
      ) : null}
      {orders.map((order, index) => {
        const delivered = order.status === "DELIVERED";
        const failed = order.status === "FAILED_DELIVERY";
        const current = order.id === nextStop;
        const Icon = delivered
          ? Check
          : failed
            ? CircleX
            : current
              ? Truck
              : MapPin;
        return (
          <TimelineItem
            key={order.id}
            step={index + 2}
            render={<li />}
            className={itemClass}
            aria-current={current ? "step" : undefined}
          >
            <TimelineHeader>
              <TimelineSeparator className={separatorClass} />
              <TimelineTitle className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 break-words">
                  <Text value="Stop " />
                  {order.sequence} · {order.customerFirstName}
                </span>
                <Badge
                  variant={
                    delivered
                      ? "success"
                      : failed
                        ? "destructive"
                        : current
                          ? "default"
                          : "secondary"
                  }
                >
                  <Text value={orderStatusLabels[order.status]} />
                </Badge>
              </TimelineTitle>
              <TimelineIndicator
                className={`${indicatorClass} ${delivered || current ? "bg-primary text-primary-foreground" : failed ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </TimelineIndicator>
            </TimelineHeader>
            <TimelineContent className="mt-2 min-w-0 rounded-lg border border-border bg-muted/20 p-3 text-foreground">
              <p className="break-all font-mono text-xs text-muted-foreground">
                {order.id}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto]">
                <div className="col-span-2 min-w-0 lg:col-span-1">
                  <dt className="text-muted-foreground">
                    <Text value="Delivery location" />
                  </dt>
                  <dd className="break-words font-medium">
                    {order.deliveryLocation.address}
                  </dd>
                </div>
                <div className="col-span-2 min-w-0 lg:col-span-1">
                  <dt className="text-muted-foreground">
                    <Text value="Coordinates" />
                  </dt>
                  <dd className="break-words font-medium">
                    {order.deliveryLocation.latitude},{" "}
                    {order.deliveryLocation.longitude}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    <Text value="Items" />
                  </dt>
                  <dd className="font-medium">{order.itemCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    <Text value="Cash on delivery" />
                  </dt>
                  <dd className="font-medium">LKR {order.total}</dd>
                </div>
                {order.customerNote ? (
                  <div className="col-span-full min-w-0">
                    <dt className="text-muted-foreground">
                      <Text value="Delivery instructions " />
                    </dt>
                    <dd className="break-words font-medium">
                      {order.customerNote}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
