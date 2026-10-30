import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeliveryMap } from "@/features/maps/components/delivery-map";
import type { MapProviderAdapter } from "@/features/maps/types";

const data = {
  markers: [
    {
      id: "shop-1",
      kind: "shop" as const,
      label: "Shop · Central Shop",
      markerLabel: "S",
      latitude: 6.927079,
      longitude: 79.861244,
    },
    {
      id: "order-1",
      kind: "delivery-stop" as const,
      label: "Stop 1 · Home",
      markerLabel: "1",
      sequence: 1,
      latitude: 6.91,
      longitude: 79.85,
    },
  ],
  omittedLocations: ["Stop 2"],
};

afterEach(cleanup);

describe("DeliveryMap", () => {
  it("passes the correct markers to the configured provider", () => {
    const buildStaticMapUrl = vi.fn(() => "https://maps.example.test/mock");
    const provider: MapProviderAdapter = {
      id: "mock-provider",
      buildStaticMapUrl,
    };
    render(
      <DeliveryMap
        data={data}
        config={{ NEXT_PUBLIC_MAP_PROVIDER: "disabled" }}
        provider={provider}
      />,
    );

    expect(buildStaticMapUrl).toHaveBeenCalledWith(data.markers, {
      width: 1000,
      height: 500,
    });
    expect(
      screen.getByRole("img", {
        name: "Map showing the shop and numbered delivery stops",
      }),
    ).toHaveAttribute("data-map-provider", "mock-provider");
    expect(screen.getByText("Shop · Central Shop")).toBeVisible();
    expect(screen.getByText("Stop 1 · Home")).toBeVisible();
    expect(screen.getByRole("note")).toHaveTextContent("Stop 2");
  });

  it("renders a useful fallback without calling an external provider", () => {
    render(
      <DeliveryMap
        data={{ markers: [], omittedLocations: ["Shop", "Stop 1"] }}
        config={{ NEXT_PUBLIC_MAP_PROVIDER: "disabled" }}
        provider={null}
      />,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(
      screen.getByText(/no valid coordinates are available/i),
    ).toBeVisible();
    expect(screen.getByRole("note")).toHaveTextContent("Shop, Stop 1");
  });
});
