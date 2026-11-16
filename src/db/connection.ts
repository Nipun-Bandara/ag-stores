import { Socket } from "node:net";
import type { PoolConfig } from "pg";

/** Keep IPv4 routing local to PostgreSQL, without changing Node's global networking. */
export function databaseConnectionConfig(
  connectionString: string,
  preferIpv4 = false,
): PoolConfig {
  return {
    connectionString,
    ...(preferIpv4 && {
      stream: () => {
        const socket = new Socket();
        const connect = socket.connect.bind(socket);
        // pg calls stream.connect(port, host); preserve the hostname for TLS verification.
        socket.connect = ((port: number, host: string) =>
          connect({
            port,
            host,
            family: 4,
            autoSelectFamily: false,
          })) as typeof socket.connect;
        return socket;
      },
    }),
  };
}
