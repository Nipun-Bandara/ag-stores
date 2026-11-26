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
  pin: vi.fn(),
  flyTo: vi.fn(),
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
        mapState.created(options);
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
      flyTo(options: unknown) {
        mapState.flyTo(options);
      }
    },
    NavigationControl: class {},
    Marker: class {
      setLngLat(point: unknown) {
        mapState.pin(point);
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
  mapState.pin.mockClear();
  mapState.flyTo.mockClear();
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
        <LocationPicker
          value={null}
          onChange={onChange}
          accessToken="pk.test"
        />
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

  it("requests a fresh location and opens the map on it instead of restoring a previous pin, then waits for confirmation", async () => {
    const onChange = vi.fn();
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: { latitude: 6.9271, longitude: 79.8612, accuracy: 25 },
      } as GeolocationPosition);
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition,
      },
    });

    render(
      <LocationPicker
        value={{ latitude: 7.2, longitude: 80.5 }}
        onChange={onChange}
        accessToken="pk.test"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Use my current location" }),
    );

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    await waitFor(() =>
      expect(mapState.created).toHaveBeenCalledWith(
        expect.objectContaining({ center: [79.8612, 6.9271], zoom: 16 }),
      ),
    );
    expect(mapState.pin).toHaveBeenLastCalledWith([79.8612, 6.9271]);
    expect(screen.getByRole("status")).toHaveTextContent("25 m");
    fireEvent.click(screen.getByRole("button", { name: "Use this location" }));
    expect(onChange).toHaveBeenCalledWith({
      latitude: 6.9271,
      longitude: 79.8612,
    });
  });

  it("ignores a late location response after cancellation and keeps the old location unchanged", async () => {
    let locate: PositionCallback = () => {};
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback) {
          locate = success;
        },
      },
    });
    const onChange = vi.fn();
    render(
      <LocationPicker
        value={{ latitude: 7.2, longitude: 80.5 }}
        onChange={onChange}
        accessToken="pk.test"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Use my current location" }),
    );
    expect(
      screen.getByRole("button", { name: "Use this location" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    act(() =>
      locate({
        coords: { latitude: 6.9, longitude: 79.8 },
      } as GeolocationPosition),
    );
    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Adjust pin on map" }));
    await waitFor(() =>
      expect(mapState.pin).toHaveBeenLastCalledWith([80.5, 7.2]),
    );
  });

  it("shows an error without allowing the previous pin to be confirmed when live location fails", () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(
          _success: PositionCallback,
          failure: PositionErrorCallback,
        ) {
          failure({ code: 1 } as GeolocationPositionError);
        },
      },
    });
    const onChange = vi.fn();
    render(
      <LocationPicker
        value={{ latitude: 7.2, longitude: 80.5 }}
        onChange={onChange}
        accessToken="pk.test"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Use my current location" }),
    );
    expect(
      screen.getByRole("button", { name: "Use this location" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Location access was unavailable",
    );
    expect(onChange).not.toHaveBeenCalled();
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
