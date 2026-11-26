import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

describe("product photo display", () => {
  it("uses accessible alt text and falls back when an image cannot load", () => {
    const { rerender } = render(
      <ImageWithFallback
        src="https://example.test/tea.jpg"
        alt="Tea packet"
        fallback="No photo"
      />,
    );
    fireEvent.error(screen.getByRole("img", { name: "Tea packet" }));
    expect(screen.getByText("No photo")).toBeTruthy();
    rerender(
      <ImageWithFallback
        src="https://example.test/new-tea.jpg"
        alt="New tea packet"
        fallback="No photo"
      />,
    );
    expect(screen.getByRole("img", { name: "New tea packet" })).toBeTruthy();
  });
});
