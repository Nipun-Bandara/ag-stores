import { redirect } from "next/navigation";
import { routePath } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";

export default async function HomePage() {
  const { locale, localizedRoute } = await getLocaleContext();
  redirect(routePath("/auth", locale, localizedRoute));
}
