import { MapboxStaticMapProvider } from "@/features/maps/providers/mapbox-static.provider";
import type { MapProviderAdapter } from "@/features/maps/types";
import type { PublicMapConfig } from "@/validations/map-env";

export function createMapProvider(
  config: PublicMapConfig,
): MapProviderAdapter | null {
  if (config.NEXT_PUBLIC_MAP_PROVIDER === "disabled") return null;
  return new MapboxStaticMapProvider(config.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);
}
