import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PasswordForm } from "@/features/account/components/password-form";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: mocks }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function fillPasswordForm() {
  const { container } = render(<PasswordForm />);
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: "OldPassword1" },
  });
  fireEvent.change(screen.getByLabelText("New password", { exact: true }), {
    target: { value: "Abcdefg1" },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: "Abcdefg1" },
  });
  return container.querySelector("form")!;
}
it("uses only a success toast, resets passwords, and permits the eight-character minimum", async () => {
  mocks.fetch.mockResolvedValue({ ok: true });
  const form = fillPasswordForm();
  expect(
    screen.queryByText(
      "Use 8+ characters with uppercase, lowercase, and a number.",
    ),
  ).not.toBeInTheDocument();
  expect(
    screen.getByLabelText("New password", { exact: true }),
  ).toHaveAttribute("minlength", "8");
  fireEvent.submit(form);
  await waitFor(() =>
    expect(mocks.success).toHaveBeenCalledWith(
      "Password changed successfully.",
    ),
  );
  expect(screen.getByLabelText("New password", { exact: true })).toHaveValue(
    "",
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it.each(["server", "network"])(
  "uses only an error toast for %s failures and preserves inputs for retry",
  async (failure) => {
    if (failure === "server")
      mocks.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { message: "Current password is incorrect." },
        }),
      });
    else mocks.fetch.mockRejectedValue(new Error("Network error"));
    fireEvent.submit(fillPasswordForm());
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(
        failure === "server"
          ? "Current password is incorrect."
          : "Unable to change your password.",
      ),
    );
    expect(screen.getByLabelText("New password", { exact: true })).toHaveValue(
      "Abcdefg1",
    );
    expect(
      screen.getByRole("button", { name: "Change password" }),
    ).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  },
);

it("toggles each password independently without submitting the form or changing its values", () => {
  fillPasswordForm();
  const inputs = [
    screen.getByLabelText("Current password"),
    screen.getByLabelText("New password", { exact: true }),
    screen.getByLabelText("Confirm new password"),
  ];
  const toggles = screen.getAllByRole("button", { name: "Show password" });
  expect(toggles).toHaveLength(3);
  for (const [index, toggle] of toggles.entries()) {
    expect(toggle).toHaveAttribute("aria-controls", inputs[index]!.id);
    fireEvent.click(toggle);
    inputs.forEach((input, position) => {
      expect(input).toHaveAttribute(
        "type",
        position === index ? "text" : "password",
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
  }
  expect(inputs[0]).toHaveValue("OldPassword1");
  expect(inputs[1]).toHaveValue("Abcdefg1");
  expect(inputs[2]).toHaveValue("Abcdefg1");
  expect(mocks.fetch).not.toHaveBeenCalled();
});
