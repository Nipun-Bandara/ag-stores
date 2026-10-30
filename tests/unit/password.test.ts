import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("creates salted hashes instead of storing plaintext", async () => {
    const first = await hashPassword("SecurePassword123!");
    const second = await hashPassword("SecurePassword123!");

    expect(first).toMatch(/^scrypt\$/);
    expect(first).not.toContain("SecurePassword123!");
    expect(first).not.toBe(second);
  });

  it("verifies the correct password", async () => {
    const hash = await hashPassword("SecurePassword123!");

    await expect(verifyPassword("SecurePassword123!", hash)).resolves.toBe(
      true,
    );
  });

  it("rejects wrong passwords and malformed hashes", async () => {
    const hash = await hashPassword("SecurePassword123!");

    await expect(verifyPassword("WrongPassword123!", hash)).resolves.toBe(
      false,
    );
    await expect(verifyPassword("SecurePassword123!", "invalid")).resolves.toBe(
      false,
    );
  });
});
