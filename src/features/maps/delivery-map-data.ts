import type { DeliveryMapData, MapMarker } from "@/features/maps/types";

interface CoordinateInput {
  latitude?: string | number | null;
  longitude?: string | number | null;
}

interface ShopLocationInput extends CoordinateInput {
  id?: string;
  name: string;
}

interface DeliveryStopInput extends CoordinateInput {
  id: string;
  sequence: number;
  label: string;
}

function parseCoordinate(
  value: string | number | null | undefined,
  minimum: number,
  maximum: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

export function createMapMarker(input: {
  id: string;
  kind: MapMarker["kind"];
  label: string;
  markerLabel: string;
  sequence?: number;
  latitude?: string | number | null | undefined;
  longitude?: string | number | null | undefined;
}): MapMarker | null {
  const latitude = parseCoordinate(input.latitude, -90, 90);
  const longitude = parseCoordinate(input.longitude, -180, 180);
  if (latitude === null || longitude === null) return null;
  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    markerLabel: input.markerLabel,
    latitude,
    longitude,
    ...(input.sequence === undefined ? {} : { sequence: input.sequence }),
  };
}

export function buildDeliveryMapData(input: {
  shop: ShopLocationInput | null;
  stops: readonly DeliveryStopInput[];
}): DeliveryMapData {
  const markers: MapMarker[] = [];
  const omittedLocations: string[] = [];

  if (input.shop) {
    const marker = createMapMarker({
      id: input.shop.id ?? "shop",
      kind: "shop",
      label: `Shop · ${input.shop.name}`,
      markerLabel: "S",
      latitude: input.shop.latitude,
      longitude: input.shop.longitude,
    });
    if (marker) markers.push(marker);
    else omittedLocations.push("Shop");
  } else {
    omittedLocations.push("Shop");
  }

  for (const stop of [...input.stops].sort(
    (first, second) => first.sequence - second.sequence,
  )) {
    const marker = createMapMarker({
      id: stop.id,
      kind: "delivery-stop",
      label: `Stop ${stop.sequence} · ${stop.label}`,
      markerLabel: String(stop.sequence),
      sequence: stop.sequence,
      latitude: stop.latitude,
      longitude: stop.longitude,
    });
    if (marker) markers.push(marker);
    else omittedLocations.push(`Stop ${stop.sequence}`);
  }

  return { markers, omittedLocations };
}
