import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ImageWithFallback } from "@/components/ui/image-with-fallback";

afterEach(cleanup);

describe("ImageWithFallback", () => {
  it("shows fallback text when no image URL is available", () => {
    render(<ImageWithFallback src={null} alt="Tea" fallback="No image" />);
    expect(screen.getByText("No image")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the image and falls back if it fails to load", () => {
    render(
      <ImageWithFallback
        src="https://example.test/tea.jpg"
        alt="Tea"
        fallback="No image"
      />,
    );
    const image = screen.getByRole("img", { name: "Tea" });
    expect(image).toBeInTheDocument();
    fireEvent.error(image);
    expect(screen.getByText("No image")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
