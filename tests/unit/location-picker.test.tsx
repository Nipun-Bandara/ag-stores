import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LocationPicker,
  parsePickedLocation,
} from "@/features/maps/components/location-picker";

const mapState = vi.hoisted(() => ({
  created: vi.fn(),
  handlers: new Map<
    string,
    (event: { lngLat: { lat: number; lng: number } }) => void
  >(),
}));

vi.mock("mapbox-gl", () => ({
  default: {
    accessToken: "",
    supported: () => true,
    Map: class {
      constructor(options: { container: HTMLElement }) {
        mapState.created(options.container);
      }
      addControl() {}
      on(
        name: string,
        handler: (event: { lngLat: { lat: number; lng: number } }) => void,
      ) {
        mapState.handlers.set(name, handler);
      }
      remove() {}
      resize() {}
      flyTo() {}
    },
    NavigationControl: class {},
    Marker: class {
      setLngLat() {
        return this;
      }
      addTo() {
        return this;
      }
      on() {
        return this;
      }
      remove() {}
    },
  },
}));

const originalGeolocation = Object.getOwnPropertyDescriptor(
  navigator,
  "geolocation",
);

afterEach(() => {
  cleanup();
  mapState.created.mockClear();
  mapState.handlers.clear();
  if (originalGeolocation) {
    Object.defineProperty(navigator, "geolocation", originalGeolocation);
  } else {
    Reflect.deleteProperty(navigator, "geolocation");
  }
});

describe("location picker", () => {
  it("initializes the map after the dialog portal mounts and accepts a pin", async () => {
    const onChange = vi.fn();
    render(
      <form>
        <LocationPicker value={null} onChange={onChange} accessToken="pk.test" />
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Choose on map" }));
    await waitFor(() => expect(mapState.created).toHaveBeenCalledOnce());

    act(() =>
      mapState.handlers.get("click")?.({
        lngLat: { lat: 6.9271, lng: 79.8612 },
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Use this location" }));
    expect(onChange).toHaveBeenCalledWith({
      latitude: 6.9271,
      longitude: 79.8612,
    });
  });

  it("accepts a browser location without asking for coordinates", () => {
    const onChange = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback) {
          success({
            coords: { latitude: 6.9271, longitude: 79.8612 },
          } as GeolocationPosition);
        },
      },
    });

    render(<LocationPicker value={null} onChange={onChange} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Use my current location" }),
    );

    expect(onChange).toHaveBeenCalledWith({
      latitude: 6.9271,
      longitude: 79.8612,
    });
  });

  it("rejects invalid coordinates", () => {
    expect(parsePickedLocation("", "79.8")).toBeNull();
    expect(parsePickedLocation("91", "79.8")).toBeNull();
    expect(parsePickedLocation("6.9", "181")).toBeNull();
    expect(parsePickedLocation("6.9", "79.8")).toEqual({
      latitude: 6.9,
      longitude: 79.8,
    });
  });
});
