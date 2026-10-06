import { z } from "zod";

const disabledMapConfigSchema = z.object({
  NEXT_PUBLIC_MAP_PROVIDER: z.literal("disabled"),
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z
    .string()
    .startsWith(
      "pk.",
      "Mapbox browser tokens must be public tokens beginning with pk.",
    )
    .optional(),
});

const mapboxMapConfigSchema = z.object({
  NEXT_PUBLIC_MAP_PROVIDER: z.literal("mapbox"),
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z
    .string()
    .min(1)
    .startsWith(
      "pk.",
      "Mapbox browser tokens must be public tokens beginning with pk.",
    ),
});

export const publicMapEnvSchema = z.discriminatedUnion(
  "NEXT_PUBLIC_MAP_PROVIDER",
  [disabledMapConfigSchema, mapboxMapConfigSchema],
);

export type PublicMapConfig = z.infer<typeof publicMapEnvSchema>;

export function parsePublicMapEnv(
  environment: Record<string, string | undefined>,
): PublicMapConfig {
  return publicMapEnvSchema.parse({
    NEXT_PUBLIC_MAP_PROVIDER:
      environment.NEXT_PUBLIC_MAP_PROVIDER || "disabled",
    ...(environment.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
      ? {
          NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN:
            environment.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
        }
      : {}),
  });
}

export function getPublicMapConfig(): PublicMapConfig {
  return parsePublicMapEnv({
    NEXT_PUBLIC_MAP_PROVIDER: process.env.NEXT_PUBLIC_MAP_PROVIDER,
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN:
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
  });
}
