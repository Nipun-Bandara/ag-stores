import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";

vi.mock("@/services/storefront.service", () => ({
  listStorefrontCategories: vi.fn().mockResolvedValue([]),
  listStorefrontProducts: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/i18n/server", () => ({
  getLocaleContext: vi.fn().mockResolvedValue({
    locale: "en",
    localizedRoute: false,
  }),
}));

vi.mock("@/features/i18n/components/language-switcher", () => ({
  LanguageSwitcher: () => <select aria-label="Language" />,
}));

describe("application", () => {
  it("renders the application landing page", async () => {
    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your neighborhood market, delivered.",
      }),
    ).toBeInTheDocument();
  });
});
