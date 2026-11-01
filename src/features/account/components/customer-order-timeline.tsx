import { Check, CircleX } from "lucide-react";

import {
  Timeline,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { DateText } from "@/features/i18n/components/date-text";
import { Text } from "@/features/i18n/components/text";
import { orderStatusLabels } from "@/features/orders/order-presentation";
import type { getCustomerOrderDetails } from "@/services/customer-order.service";

type Events = Awaited<ReturnType<typeof getCustomerOrderDetails>>["timeline"];

export function CustomerOrderTimeline({ events }: { events: Events }) {
  const sortedEvents = [...events].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  if (!sortedEvents.length) {
    return (
      <Empty className="mt-3">
        <EmptyHeader>
          <EmptyTitle>
            <Text value="No status changes yet." />
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Timeline
      value={sortedEvents.length}
      render={<ol />}
      className="mt-4 w-full"
    >
      {sortedEvents.map((event, index) => {
        const unsuccessful = [
          "CANCELLED",
          "REJECTED",
          "FAILED_DELIVERY",
        ].includes(event.status);
        const Icon = unsuccessful ? CircleX : Check;

        return (
          <TimelineItem
            key={`${event.status}-${event.createdAt}-${index}`}
            step={index + 1}
            render={<li />}
            aria-current={
              index === sortedEvents.length - 1 ? "step" : undefined
            }
            className="min-w-0 group-data-[orientation=vertical]/timeline:ms-8"
          >
            <TimelineHeader>
              <TimelineSeparator className="group-data-[orientation=vertical]/timeline:-left-5 group-data-[orientation=vertical]/timeline:translate-y-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.75rem)]" />
              <TimelineDate
                dateTime={event.createdAt}
                className="group-data-[orientation=vertical]/timeline:max-sm:h-auto"
              >
                <DateText value={event.createdAt} />
              </TimelineDate>
              <TimelineTitle className="break-words">
                <Text value={orderStatusLabels[event.status]} />
              </TimelineTitle>
              <TimelineIndicator
                className={`flex size-6 items-center justify-center border-0 group-data-[orientation=vertical]/timeline:-left-5 ${unsuccessful ? "bg-destructive/10 text-destructive" : "bg-primary text-primary-foreground"}`}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </TimelineIndicator>
            </TimelineHeader>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
