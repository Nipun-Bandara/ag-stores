import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Register from "@/features/auth/components/Register";
import Login from "@/features/auth/components/Login";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => mocks }));
vi.mock("sonner", () => ({ toast: mocks }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.register.mockResolvedValue(undefined);
  mocks.login.mockResolvedValue(undefined);
});
afterEach(cleanup);

it("registers using an eight-character password without a symbol and the selected language", async () => {
  render(<Register returnTo="/account" onSwitchToLogin={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "Sample" },
  });
  fireEvent.change(screen.getByLabelText("Last name"), {
    target: { value: "Customer" },
  });
  fireEvent.change(screen.getByLabelText("Mobile number"), {
    target: { value: "0771234567" },
  });
  const password = screen.getByLabelText("Password", { exact: true });
  fireEvent.change(password, { target: { value: "Abcdefg1" } });
  expect(password).toHaveAttribute("type", "password");
  expect(
    screen.queryByText(
      "Use 8+ characters with uppercase, lowercase, and a number.",
    ),
  ).not.toBeInTheDocument();
  expect(password).not.toHaveAttribute("aria-describedby");
  const show = screen.getByRole("button", { name: "Show password" });
  expect(show.textContent).toBe("");
  fireEvent.click(show);
  expect(password).toHaveAttribute("type", "text");
  expect(password).toHaveValue("Abcdefg1");
  expect(mocks.register).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
  expect(password).toHaveAttribute("type", "password");
  const language = screen.getByRole("combobox", { name: "Preferred language" });
  expect(language).toHaveTextContent("English");
  fireEvent.click(language);
  const sinhala = await screen.findByRole("option", { name: "සිංහල" });
  fireEvent.pointerDown(sinhala, { pointerType: "mouse" });
  fireEvent.click(sinhala);
  expect(language).toHaveTextContent("සිංහල");
  fireEvent.click(screen.getByRole("button", { name: "Register" }));
  await waitFor(() =>
    expect(mocks.register).toHaveBeenCalledWith(
      {
        firstName: "Sample",
        lastName: "Customer",
        phone: "+94771234567",
        email: null,
        password: "Abcdefg1",
        preferredLanguage: "SI",
      },
      "/account",
    ),
  );
});

it("shows the current password requirement and blocks invalid registration passwords", async () => {
  render(<Register returnTo="/account" onSwitchToLogin={vi.fn()} />);
  const password = screen.getByLabelText("Password", { exact: true });
  fireEvent.change(password, { target: { value: "abcdefgh1" } });
  fireEvent.blur(password);
  await waitFor(() => expect(password).toHaveAttribute("aria-invalid", "true"));
  expect(
    screen.getByText(
      "Use 8+ characters with uppercase, lowercase, and a number.",
      { selector: "#register-password-error" },
    ),
  ).toBeVisible();
  expect(mocks.register).not.toHaveBeenCalled();
});

it("toggles login password visibility without submitting or changing the credentials", async () => {
  render(<Login returnTo="/account" onSwitchToSignup={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Mobile number"), {
    target: { value: "0771234567" },
  });
  const password = screen.getByLabelText("Password", { exact: true });
  fireEvent.change(password, { target: { value: "existing-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Show password" }));
  expect(password).toHaveAttribute("type", "text");
  expect(mocks.login).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
  expect(password).toHaveAttribute("type", "password");
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() =>
    expect(mocks.login).toHaveBeenCalledWith(
      { identifier: "0771234567", password: "existing-password" },
      "/account",
    ),
  );
});

it("reports failed registration through Sonner without an inline server-error banner", async () => {
  mocks.register.mockRejectedValue(new Error("Unable to create your account."));
  render(<Register returnTo="/account" onSwitchToLogin={vi.fn()} />);
  for (const [label, value] of [
    ["First name", "Sample"],
    ["Last name", "Customer"],
    ["Mobile number", "0771234567"],
    ["Password", "Abcdefg1"],
  ]) {
    fireEvent.change(screen.getByLabelText(label!, { exact: true }), {
      target: { value },
    });
  }
  fireEvent.click(screen.getByRole("button", { name: "Register" }));
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith("Unable to create your account."),
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByLabelText("First name")).toHaveValue("Sample");
});
