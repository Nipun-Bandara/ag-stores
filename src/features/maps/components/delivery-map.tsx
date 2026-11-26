import { MapPin, Store } from "lucide-react";
import {
  Timeline,
  TimelineContent,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import { Text } from "@/features/i18n/components/text";
import { createMapProvider } from "@/features/maps/map-provider.factory";
import type {
  DeliveryMapData,
  MapProviderAdapter,
} from "@/features/maps/types";
import {
  getPublicMapConfig,
  type PublicMapConfig,
} from "@/validations/map-env";
import { Card } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/text";

export function DeliveryMap({
  data,
  config = getPublicMapConfig(),
  provider = createMapProvider(config),
  locale = "en",
}: {
  data: DeliveryMapData;
  config?: PublicMapConfig;
  provider?: MapProviderAdapter | null;
  locale?: Locale;
}) {
  const t = (english: string) => translate(locale, english);
  const mapUrl =
    provider && data.markers.length > 0
      ? provider.buildStaticMapUrl(data.markers, {
          width: 1000,
          height: 500,
        })
      : null;

  return (
    <Card
      as="section"
      className="min-w-0 gap-0 border border-border p-4 ring-0 sm:p-5"
      aria-labelledby="delivery-map-title"
    >
      <h2 id="delivery-map-title" className="text-lg font-semibold">
        <Text value={"Delivery map "} />
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text
          value={
            "Stops follow the saved delivery sequence. Road-route optimization is not applied. "
          }
        />
      </p>

      {mapUrl ? (
        // The provider URL contains only a restricted public browser token.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mapUrl}
          alt={t("Map showing the shop and numbered delivery stops")}
          width={1000}
          height={500}
          className="mt-3 aspect-2/1 w-full rounded-lg border border-border object-cover"
          data-map-provider={provider?.id}
        />
      ) : (
        <Empty className="mt-4">
          <EmptyHeader>
            <EmptyTitle>
              <Text
                value={
                  data.markers.length === 0
                    ? "Map unavailable because no valid coordinates are available."
                    : "Map preview is disabled. Configure a public map provider token to enable it."
                }
              />
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}

      <Timeline
        value={0}
        render={<ol />}
        className="mt-4 w-full"
        aria-label={t("Map markers")}
      >
        {[...data.markers]
          .sort((a, b) =>
            a.kind === b.kind
              ? (a.sequence ?? 0) - (b.sequence ?? 0)
              : a.kind === "shop"
                ? -1
                : 1,
          )
          .map((marker, index) => (
            <TimelineItem
              key={`${marker.kind}-${marker.id}`}
              step={index + 1}
              render={<li />}
              className="min-w-0 group-data-[orientation=vertical]/timeline:ms-8 group-data-[orientation=vertical]/timeline:not-last:pb-4"
            >
              <TimelineHeader>
                <TimelineSeparator className="bg-border group-data-[orientation=vertical]/timeline:-left-5 group-data-[orientation=vertical]/timeline:translate-y-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.75rem)]" />
                <TimelineTitle className="break-words">
                  {marker.label}
                </TimelineTitle>
                <TimelineIndicator
                  className={`flex size-6 items-center justify-center border-0 group-data-[orientation=vertical]/timeline:-left-5 ${marker.kind === "shop" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {marker.kind === "shop" ? (
                    <Store className="size-3.5" aria-hidden="true" />
                  ) : (
                    <MapPin className="size-3.5" aria-hidden="true" />
                  )}
                </TimelineIndicator>
              </TimelineHeader>
              <TimelineContent className="mt-1 break-words text-xs">
                {marker.latitude}, {marker.longitude}
              </TimelineContent>
            </TimelineItem>
          ))}
      </Timeline>

      {data.omittedLocations.length > 0 ? (
        <p role="note" className="mt-4 text-sm text-amber-800">
          <Text
            value={"Not shown because coordinates are missing or invalid:"}
          />{" "}
          {data.omittedLocations.join(", ")}.
        </p>
      ) : null}
    </Card>
  );
}
