import type {
  MapMarker,
  MapProviderAdapter,
  StaticMapOptions,
} from "@/features/maps/types";

function markerOverlay(marker: MapMarker): string {
  const color = marker.kind === "shop" ? "111827" : "2563eb";
  const label = encodeURIComponent(marker.markerLabel.slice(0, 3));
  return `pin-l-${label}+${color}(${marker.longitude},${marker.latitude})`;
}

export class MapboxStaticMapProvider implements MapProviderAdapter {
  readonly id = "mapbox";

  constructor(private readonly publicAccessToken: string) {}

  buildStaticMapUrl(
    markers: readonly MapMarker[],
    options: StaticMapOptions,
  ): string {
    if (markers.length === 0) {
      throw new Error("At least one valid marker is required.");
    }
    const overlay = markers.map(markerOverlay).join(",");
    const parameters = new URLSearchParams({
      access_token: this.publicAccessToken,
      attribution: "true",
      logo: "true",
      padding: "48",
    });
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${overlay}/auto/${options.width}x${options.height}@2x?${parameters}`;
  }
}
