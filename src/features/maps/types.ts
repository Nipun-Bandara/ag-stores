export type MapMarkerKind = "shop" | "delivery-stop";

export interface MapMarker {
  id: string;
  kind: MapMarkerKind;
  label: string;
  markerLabel: string;
  latitude: number;
  longitude: number;
  sequence?: number;
}

export interface DeliveryMapData {
  markers: MapMarker[];
  omittedLocations: string[];
}

export interface StaticMapOptions {
  width: number;
  height: number;
}

export interface MapProviderAdapter {
  readonly id: string;
  buildStaticMapUrl(
    markers: readonly MapMarker[],
    options: StaticMapOptions,
  ): string;
}
