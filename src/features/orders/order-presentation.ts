import type { OrderStatus } from "@/generated/prisma/client";
import type { Locale } from "@/lib/i18n/config";
import { formatLocaleDate } from "@/lib/i18n/text";

export const orderStatusLabels: Record<OrderStatus, string> = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY_FOR_DELIVERY: "Ready for delivery",
  ASSIGNED: "Assigned",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  FAILED_DELIVERY: "Failed delivery",
};

export function formatOrderDate(value: string, locale: Locale = "en"): string {
  return formatLocaleDate(locale, value);
}
