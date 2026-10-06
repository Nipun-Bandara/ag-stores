import { createMapProvider } from "@/features/maps/map-provider.factory";
import type {
  DeliveryMapData,
  MapProviderAdapter,
} from "@/features/maps/types";
import {
  getPublicMapConfig,
  type PublicMapConfig,
} from "@/validations/map-env";

export function DeliveryMap({
  data,
  config = getPublicMapConfig(),
  provider = createMapProvider(config),
}: {
  data: DeliveryMapData;
  config?: PublicMapConfig;
  provider?: MapProviderAdapter | null;
}) {
  const mapUrl =
    provider && data.markers.length > 0
      ? provider.buildStaticMapUrl(data.markers, {
          width: 1000,
          height: 500,
        })
      : null;

  return (
    <section
      className="mt-6 rounded-xl border bg-white p-5"
      aria-labelledby="delivery-map-title"
    >
      <h2 id="delivery-map-title" className="text-lg font-semibold">
        Delivery map
      </h2>
      <p className="mt-2 text-sm text-neutral-600">
        Stops follow the saved delivery sequence. Road-route optimization is not
        applied.
      </p>

      {mapUrl ? (
        // The provider URL contains only a restricted public browser token.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mapUrl}
          alt="Map showing the shop and numbered delivery stops"
          width={1000}
          height={500}
          className="mt-4 aspect-2/1 w-full rounded-lg border object-cover"
          data-map-provider={provider?.id}
        />
      ) : (
        <div className="mt-4 rounded-lg border border-dashed bg-neutral-50 p-6 text-sm text-neutral-600">
          {data.markers.length === 0
            ? "Map unavailable because no valid coordinates are available."
            : "Map preview is disabled. Configure a public map provider token to enable it."}
        </div>
      )}

      <ol className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Map markers">
        {data.markers.map((marker) => (
          <li
            key={`${marker.kind}-${marker.id}`}
            className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3 text-sm"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 font-semibold text-white">
              {marker.markerLabel}
            </span>
            <span>
              <span className="block font-medium">{marker.label}</span>
              <span className="block text-xs text-neutral-500">
                {marker.latitude}, {marker.longitude}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {data.omittedLocations.length > 0 ? (
        <p role="note" className="mt-4 text-sm text-amber-800">
          Not shown because coordinates are missing or invalid:{" "}
          {data.omittedLocations.join(", ")}.
        </p>
      ) : null}
    </section>
  );
}
