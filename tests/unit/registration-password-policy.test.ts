import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/register/route";

const mocks = vi.hoisted(() => ({ register: vi.fn() }));
vi.mock("@/services/auth.service", () => ({
  registerCustomer: mocks.register,
}));
vi.mock("@/lib/auth/cookie", () => ({ setSessionCookie: vi.fn() }));
vi.mock("@/lib/i18n/cookie", () => ({ setLocaleCookie: vi.fn() }));
vi.mock("@/lib/security/auth-rate-limit", () => ({
  consumeAuthAttempt: () => ({ allowed: true }),
  clearAuthAttempts: vi.fn(),
  applyRateLimitHeaders: (response: Response) => response,
}));

const details = {
  firstName: "Sample",
  lastName: "Customer",
  phone: "0771234567",
  email: "",
  preferredLanguage: "EN",
};
function request(password: string) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...details, password }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.register.mockResolvedValue({
    user: { id: "customer", preferredLanguage: "EN" },
    session: {},
  });
});

it("accepts an eight-character password with lowercase, uppercase and a number without requiring a symbol", async () => {
  const response = await POST(request("Abcdefg1"));
  expect(response.status).toBe(201);
  expect(mocks.register).toHaveBeenCalledWith(
    expect.objectContaining({ password: "Abcdefg1" }),
  );
});

it.each([
  ["Abcdef1", "Password must contain at least 8 characters."],
  ["ABCDEFG1", "Password must contain a lowercase letter."],
  ["abcdefg1", "Password must contain an uppercase letter."],
  ["Abcdefgh", "Password must contain a number."],
])(
  "returns the current API validation error for %s",
  async (password, message) => {
    const response = await POST(request(password));
    expect(response.status).toBe(400);
    expect((await response.json()).error.details.password).toEqual([message]);
    expect(mocks.register).not.toHaveBeenCalled();
  },
);
