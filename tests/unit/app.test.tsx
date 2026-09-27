import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("application", () => {
  it("renders the application landing page", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "AG Stores" }),
    ).toBeInTheDocument();
  });
});
