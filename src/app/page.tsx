import { redirect } from "next/navigation";

import { routePath } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";

/**
 * Everyone starts at the store Home. Signed-out visitors browse as guests;
 * signed-in owners and staff are sent on to their dashboard by the storefront
 * layout.
 */
export default async function RootPage() {
  const { locale, localizedRoute } = await getLocaleContext();
  redirect(routePath("/home", locale, localizedRoute));
}
