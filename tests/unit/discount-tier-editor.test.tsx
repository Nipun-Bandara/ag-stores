import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useState } from "react";
import {
  DiscountTierEditor,
  type TierDraft,
} from "@/features/owner/components/discount-tier-editor";
import { LocaleProvider } from "@/features/i18n/components/locale-provider";
import { ProductPrice } from "@/features/pricing/price-display";
afterEach(cleanup);
function Editor() {
  const [drafts, setDrafts] = useState<TierDraft[]>([]);
  return (
    <DiscountTierEditor
      regularPrice="100.00"
      drafts={drafts}
      onChange={setDrafts}
      setup={{ sellingUnit: "UNIT" }}
    />
  );
}
it("starts empty, adds up to four rows, removes rows and previews exact prices", () => {
  render(<Editor />);
  expect(
    screen.queryByLabelText("Tier minimum quantity 1"),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add discount tier" }));
  fireEvent.change(screen.getByLabelText("Tier minimum quantity 1"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("Discount per unit/kg (LKR) 1"), {
    target: { value: "5" },
  });
  expect(screen.getByText(/Our price.*95.00/)).toBeInTheDocument();
  for (let i = 0; i < 3; i++)
    fireEvent.click(screen.getByRole("button", { name: "Add discount tier" }));
  expect(
    screen.getByRole("button", { name: "Add discount tier" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Remove tier 2" }));
  expect(
    screen.getByRole("button", { name: "Add discount tier" }),
  ).toBeEnabled();
});
it("shows regular, our price and savings with qualified offers in Sinhala", () => {
  render(
    <LocaleProvider locale="si">
      <ProductPrice
        regularPrice="100.00"
        quantity={1}
        discountTiers={[{ minimumQuantity: 3, discountAmount: "7.00" }]}
        locale="si"
      />
    </LocaleProvider>,
  );
  expect(screen.getByText(/සාමාන්‍ය මිල.*100.00/)).toBeInTheDocument();
  expect(screen.getByText(/අපගේ මිල.*100.00/)).toBeInTheDocument();
  expect(screen.getByText(/ඉතිරිය.*0.00/)).toBeInTheDocument();
});
it("validates discount changes against the current regular price", () => {
  render(
    <DiscountTierEditor
      regularPrice="4.00"
      drafts={[{ minimumQuantity: "1", discountAmount: "5.00" }]}
      onChange={vi.fn()}
      setup={{ sellingUnit: "UNIT" }}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("cannot exceed");
});
