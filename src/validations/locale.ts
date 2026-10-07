import { z } from "zod";

export const localePreferenceSchema = z
  .object({ locale: z.enum(["en", "si"]) })
  .strict();
