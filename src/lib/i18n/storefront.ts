import {
  getDictionary,
  localizeBilingual,
  type Locale,
} from "@/lib/i18n/config";

export { localizeBilingual };

export const storefrontCopy: Record<
  Locale,
  ReturnType<typeof getDictionary>["storefront"]
> = {
  en: getDictionary("en").storefront,
  si: getDictionary("si").storefront,
};
