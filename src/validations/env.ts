import { z } from "zod";

export const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.url().startsWith("postgresql://"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  AUTH_RATE_LIMIT_MAX_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(10),
  AUTH_RATE_LIMIT_MAX_ATTEMPTS_PER_IP: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .default(50),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  environment: Record<string, string | undefined>,
): ServerEnv {
  return serverEnvSchema.parse(environment);
}

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cachedEnv ??= parseServerEnv(process.env);
  return cachedEnv;
}
