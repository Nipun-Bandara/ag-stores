"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type mapboxgl from "mapbox-gl";
import { CircleCheck, MapPin } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { translate } from "@/lib/i18n/text";

export interface PickedLocation {
  latitude: number;
  longitude: number;
}

export function parsePickedLocation(
  latitude: string | number | null | undefined,
  longitude: string | number | null | undefined,
): PickedLocation | null {
  if (
    latitude == null ||
    longitude == null ||
    latitude === "" ||
    longitude === ""
  ) {
    return null;
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180
    ? { latitude: lat, longitude: lng }
    : null;
}

interface GeocodingFeature {
  id: string;
  geometry: { coordinates: [number, number] };
  properties?: {
    full_address?: string;
    name?: string;
    place_formatted?: string;
  };
}

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export function LocationPicker({
  value,
  onChange,
  accessToken = mapboxToken,
}: {
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
  accessToken?: string;
}) {
  const t = useText();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PickedLocation | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingFeature[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  // const [manualLatitude, setManualLatitude] = useState("");
  // const [manualLongitude, setManualLongitude] = useState("");
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const mapboxRef = useRef<typeof mapboxgl | null>(null);

  const placePin = useCallback((location: PickedLocation) => {
    const map = mapRef.current;
    const mapbox = mapboxRef.current;
    if (map && mapbox) {
      if (markerRef.current) {
        markerRef.current.setLngLat([location.longitude, location.latitude]);
      } else {
        const marker = new mapbox.Marker({ color: "#0f766e", draggable: true })
          .setLngLat([location.longitude, location.latitude])
          .addTo(map);
        marker.on("dragend", () => {
          const point = marker.getLngLat();
          setDraft({ latitude: point.lat, longitude: point.lng });
        });
        markerRef.current = marker;
      }
    }
    setDraft(location);
  }, []);

  useEffect(() => {
    const container = mapContainer;
    if (!open || !accessToken || !container) return;
    let cancelled = false;
    let map: mapboxgl.Map | undefined;
    async function createMap(container: HTMLDivElement, token: string) {
      try {
        const { default: mapbox } = await import("mapbox-gl");
        if (cancelled || !container.isConnected) return;
        if (!mapbox.supported()) {
          setError(
            translate(
              locale,
              "This browser cannot display the map. Use your current location or enter coordinates manually.",
            ),
          );
          return;
        }
        mapbox.accessToken = token;
        mapboxRef.current = mapbox;
        map = new mapbox.Map({
          container,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [value?.longitude ?? 80.7718, value?.latitude ?? 7.8731],
          zoom: value ? 15 : 7,
        });
        mapRef.current = map;
        map.addControl(
          new mapbox.NavigationControl({ showCompass: false }),
          "top-right",
        );
        map.on("load", () => map?.resize());
        map.on("click", (event) => {
          placePin({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
        });
        if (value) placePin(value);
      } catch {
        if (!cancelled)
          setError(
            translate(
              locale,
              "The map could not be loaded. Try again or use your current location.",
            ),
          );
      }
    }
    void createMap(container, accessToken);
    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      map?.remove();
      mapRef.current = null;
      mapboxRef.current = null;
    };
  }, [open, value, locale, placePin, mapContainer, accessToken]);

  function useCurrentLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError(t("Your browser does not support location access."));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (open) {
          placePin(location);
          mapRef.current?.flyTo({
            center: [location.longitude, location.latitude],
            zoom: 16,
          });
        } else {
          onChange(location);
        }
        setLocating(false);
      },
      () => {
        setError(
          t(
            "Location access was unavailable. Search the map or place a pin instead.",
          ),
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!accessToken || !query.trim()) return;
    setSearching(true);
    setError("");
    setResults([]);
    setSearched(false);
    try {
      const params = new URLSearchParams({
        q: query.trim().slice(0, 256),
        access_token: accessToken,
        country: "lk",
        limit: "5",
      });
      const response = await fetch(
        `https://api.mapbox.com/search/geocode/v6/forward?${params}`,
      );
      if (!response.ok) throw new Error("Search failed");
      const data = (await response.json()) as { features?: GeocodingFeature[] };
      setResults(data.features ?? []);
      setSearched(true);
    } catch {
      setError(
        t(
          "Location search is unavailable. You can still place a pin on the map.",
        ),
      );
    } finally {
      setSearching(false);
    }
  }

  function chooseResult(feature: GeocodingFeature) {
    const [longitude, latitude] = feature.geometry.coordinates;
    mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 16 });
    markerRef.current?.remove();
    markerRef.current = null;
    setDraft(null);
    setResults([]);
    setSearched(false);
    setQuery(
      feature.properties?.full_address ?? feature.properties?.name ?? query,
    );
  }

  // function applyManualLocation() {
  //   const location = parsePickedLocation(manualLatitude, manualLongitude);
  //   if (!location) {
  //     setError(t("Enter valid latitude and longitude values."));
  //     return;
  //   }
  //   onChange(location);
  //   setError("");
  // }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="space-y-3 sm:col-span-2">
        <Input
          type="hidden"
          name="latitude"
          value={value?.latitude.toFixed(6) ?? ""}
          readOnly
        />
        <Input
          type="hidden"
          name="longitude"
          value={value?.longitude.toFixed(6) ?? ""}
          readOnly
        />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{t("Pin location")}</p>
            <Badge variant={value ? "success" : "warning"} aria-live="polite">
              {value ? (
                <CircleCheck aria-hidden="true" />
              ) : (
                <MapPin aria-hidden="true" />
              )}
              {t(value ? "Location pinned" : "No location selected")}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {value
              ? t("Location selected. Open the map to adjust the pin.")
              : t(
                  "Search the map, tap your exact spot, or use your current location.",
                )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {accessToken ? (
            <DialogTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDraft(value);
                    setError("");
                    setQuery("");
                    setResults([]);
                    setSearched(false);
                  }}
                >
                  {t(value ? "Adjust pin on map" : "Choose on map")}
                </Button>
              }
            />
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={useCurrentLocation}
            disabled={locating}
          >
            {locating ? t("Finding location…") : t("Use my current location")}
          </Button>
        </div>
        {!accessToken ? (
          <p className="text-sm text-muted-foreground">
            {t(
              "Map search is unavailable until a public Mapbox token is configured.",
            )}
          </p>
        ) : null}
        {error && !open ? <Alert variant="destructive">{error}</Alert> : null}
        {/* <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">
            {t("Enter coordinates manually")}
          </summary>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Label className="space-y-1">
              {t("Latitude")}
              <Input
                type="number"
                min={-90}
                max={90}
                step="any"
                value={manualLatitude}
                onChange={(event) => setManualLatitude(event.target.value)}
                className="w-36"
              />
            </Label>
            <Label className="space-y-1">
              {t("Longitude")}
              <Input
                type="number"
                min={-180}
                max={180}
                step="any"
                value={manualLongitude}
                onChange={(event) => setManualLongitude(event.target.value)}
                className="w-36"
              />
            </Label>
            <Button
              type="button"
              variant="outline"
              onClick={applyManualLocation}
            >
              {t("Use these coordinates")}
            </Button>
          </div>
        </details> */}
        <DialogContent className="max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Choose a location")}</DialogTitle>
            <DialogDescription>
              {t(
                "Search for a place, then tap the exact spot on the map or drag the pin.",
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={search} className="mt-4 flex gap-2">
            <Input
              aria-label={t("Search for a place")}
              placeholder={t("Search for a place or address")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={256}
            />
            <Button type="submit" disabled={searching || !query.trim()}>
              {searching ? t("Searching…") : t("Search")}
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            className="mt-2"
            disabled={locating}
            onClick={useCurrentLocation}
          >
            {locating ? t("Finding location…") : t("Use my current location")}
          </Button>
          {results.length ? (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border">
              {results.map((result) => (
                <Button
                  key={result.id}
                  type="button"
                  variant="ghost"
                  className="h-auto min-h-10 w-full justify-start whitespace-normal rounded-none px-3 py-2 text-left"
                  onClick={() => chooseResult(result)}
                >
                  {result.properties?.full_address ??
                    [
                      result.properties?.name,
                      result.properties?.place_formatted,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                </Button>
              ))}
            </div>
          ) : searched ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "No places found. Try a different search or place a pin on the map.",
              )}
            </p>
          ) : null}
          <div
            ref={setMapContainer}
            role="region"
            aria-label={t("Interactive location map")}
            className="mt-4 h-[48dvh] min-h-64 w-full overflow-hidden rounded-lg bg-muted"
          />
          {error && open ? (
            <Alert variant="destructive" className="mt-3">
              {error}
            </Alert>
          ) : null}
          <p className="mt-3 text-sm text-muted-foreground">
            {draft
              ? t("Pin placed. Drag it to refine the location.")
              : t("Tap the map to place your pin.")}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              variant="success"
              disabled={!draft}
              onClick={() => {
                if (!draft) return;
                onChange(draft);
                setOpen(false);
              }}
            >
              {t("Use this location")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </div>
    </Dialog>
  );
}
