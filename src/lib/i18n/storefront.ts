export type StorefrontLocale = "en" | "si";

export const storefrontCopy = {
  en: {
    brand: "AG Stores",
    products: "Products",
    categories: "Categories",
    signIn: "Sign in",
    register: "Register",
    outOfStock: "Out of Stock",
    inStock: "In stock",
    viewProduct: "View product",
  },
  si: {
    brand: "AG වෙළඳසැල්",
    products: "නිෂ්පාදන",
    categories: "කාණ්ඩ",
    signIn: "පිවිසෙන්න",
    register: "ලියාපදිංචි වන්න",
    outOfStock: "තොග අවසන්",
    inStock: "තොග ඇත",
    viewProduct: "නිෂ්පාදනය බලන්න",
  },
} as const;

export function localizeBilingual(
  english: string,
  sinhala: string | null,
  locale: StorefrontLocale,
) {
  return locale === "si" && sinhala ? sinhala : english;
}
