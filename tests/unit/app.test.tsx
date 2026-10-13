import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@/lib/i18n/config";

import HomePage from "@/app/page";
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span>{alt}</span>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("@/components/landing/CountUp", () => ({
  default: ({ to }: { to: number }) => <span>{to}</span>,
}));
afterEach(cleanup);

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
        name: getDictionary("en").landing.heroTitle,
      }),
    ).toBeInTheDocument();
  });

  it("opens the shared mobile sheet and closes it after choosing a destination", async () => {
    const copy = getDictionary("en").landing;
    render(await HomePage());
    fireEvent.click(screen.getByRole("button", { name: copy.openMenu }));
    const menu = await screen.findByRole("dialog");
    expect(
      within(menu).getByRole("link", { name: copy.features }),
    ).toHaveAttribute("href", "#features");
    fireEvent.click(within(menu).getByRole("link", { name: copy.features }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
