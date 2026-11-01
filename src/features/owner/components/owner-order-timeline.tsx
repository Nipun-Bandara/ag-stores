import { ArrowRight, Check, CircleX } from "lucide-react";
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
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { DateText } from "@/features/i18n/components/date-text";
import { Text } from "@/features/i18n/components/text";
import { orderStatusLabels } from "@/features/orders/order-presentation";
import type { getOwnerOrder } from "@/services/owner-order.service";

type History = Awaited<ReturnType<typeof getOwnerOrder>>["statusHistory"];

export function OwnerOrderTimeline({ history }: { history: History }) {
  const events = [...history].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  if (!events.length)
    return (
      <Empty className="mt-3">
        <EmptyHeader>
          <EmptyTitle>
            <Text value="No status changes yet." />
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  return (
    <Timeline value={events.length} render={<ol />} className="mt-5 w-full">
      {events.map((event, index) => {
        const unsuccessful = [
          "CANCELLED",
          "REJECTED",
          "FAILED_DELIVERY",
        ].includes(event.toStatus);
        const Icon = unsuccessful ? CircleX : Check;
        return (
          <TimelineItem
            key={event.id}
            step={index + 1}
            render={<li />}
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
              <TimelineTitle className="flex flex-wrap items-center gap-1.5">
                <Text value={orderStatusLabels[event.fromStatus]} />
                <ArrowRight
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="sr-only">
                  <Text value="to" />
                </span>
                <Text value={orderStatusLabels[event.toStatus]} />
              </TimelineTitle>
              <TimelineIndicator
                className={`flex size-6 items-center justify-center border-0 group-data-[orientation=vertical]/timeline:-left-5 ${unsuccessful ? "bg-destructive/10 text-destructive" : "bg-primary text-primary-foreground"}`}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </TimelineIndicator>
            </TimelineHeader>
            <TimelineContent className="mt-1 break-words">
              <p>
                <Text value="Changed by" />: {event.changedBy.name}
              </p>
              {event.note ? (
                <p className="mt-1 text-foreground">{event.note}</p>
              ) : null}
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
