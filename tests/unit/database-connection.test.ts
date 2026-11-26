import { Socket } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { databaseConnectionConfig } from "@/db/connection";

afterEach(() => vi.restoreAllMocks());

describe("database connection routing", () => {
  it("preserves the standard driver configuration by default", () => {
    expect(databaseConnectionConfig("postgresql://localhost/test")).toEqual({
      connectionString: "postgresql://localhost/test",
    });
  });

  it("uses IPv4 only for the database socket while preserving the TLS hostname", () => {
    const connect = vi.spyOn(Socket.prototype, "connect").mockReturnThis();
    const config = databaseConnectionConfig(
      "postgresql://db.example/test?sslmode=verify-full",
      true,
    );
    const socket = config.stream!() as Socket;
    socket.connect(5432, "db.example");
    expect(connect).toHaveBeenCalledWith({
      port: 5432,
      host: "db.example",
      family: 4,
      autoSelectFamily: false,
    });
    expect(config.connectionString).toContain("sslmode=verify-full");
    expect(config.ssl).toBeUndefined();
    socket.destroy();
  });
});
