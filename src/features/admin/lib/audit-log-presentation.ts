import type { AuditAction, AuditEntityType } from "@/generated/prisma/client";
import type { AuditLogView } from "@/services/audit-log.service";

const actions: Record<AuditAction, string> = {
  PRODUCT_PRICE_UPDATED: "Product price updated",
  PRODUCT_STOCK_UPDATED: "Product stock updated",
  ORDER_STATUS_CHANGED: "Order status changed",
  USER_STATUS_UPDATED: "User status changed",
  SHOP_CREATED: "Shop created",
  SHOP_UPDATED: "Shop details updated",
  SHOP_STATUS_UPDATED: "Shop status changed",
};
const entities: Record<AuditEntityType, string> = {
  PRODUCT: "Product",
  ORDER: "Order",
  USER: "User",
  SHOP: "Shop",
};
const fields: Record<string, string> = {
  ownerId: "Shop owner",
  name: "Shop name",
  address: "Address",
  phone: "Phone",
  latitude: "Map location",
  longitude: "Map location",
  isOpen: "Open for customer orders",
  minimumOrderAmount: "Minimum order amount (LKR)",
  deliveryFee: "Delivery fee (LKR)",
  maximumDeliveryRadiusKm: "Maximum delivery radius (km)",
};
const statuses: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
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
type Translate = (text: string) => string;

export function presentAuditLog(log: AuditLogView, t: Translate) {
  const metadata =
    log.metadata &&
    typeof log.metadata === "object" &&
    !Array.isArray(log.metadata)
      ? log.metadata
      : {};
  const statusLabel = (value: unknown) =>
    typeof value === "string"
      ? t(statuses[value] ?? "Unknown status")
      : t("Unknown status");
  let summary = t("No additional details recorded.");
  if (log.action === "SHOP_UPDATED" && Array.isArray(metadata.changedFields)) {
    const labels = [
      ...new Set(
        metadata.changedFields
          .filter((field): field is string => typeof field === "string")
          .map((field) => t(fields[field] ?? "Other shop details")),
      ),
    ];
    if (labels.length) summary = `${t("Updated fields")}: ${labels.join(", ")}`;
  } else if (
    [
      "SHOP_STATUS_UPDATED",
      "USER_STATUS_UPDATED",
      "ORDER_STATUS_CHANGED",
    ].includes(log.action)
  ) {
    summary = `${t("Status")}: ${statusLabel(metadata.previousStatus)} → ${statusLabel(metadata.newStatus)}`;
  } else if (log.action === "PRODUCT_PRICE_UPDATED") {
    const amount = (value: unknown) =>
      (typeof value === "string" || typeof value === "number") &&
      value !== "" &&
      Number.isFinite(Number(value))
        ? `LKR ${Number(value).toFixed(2)}`
        : t("Not recorded");
    summary = `${t("Price")}: ${amount(metadata.previousPrice)} → ${amount(metadata.newPrice)}`;
  } else if (log.action === "PRODUCT_STOCK_UPDATED") {
    const quantity = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : t("Not recorded");
    summary = `${t("Stock quantity")}: ${quantity(metadata.previousQuantity)} → ${quantity(metadata.newQuantity)}`;
  } else if (log.action === "SHOP_CREATED") {
    summary = t("Shop account created.");
  }
  const entityName =
    log.entityName ??
    (log.action === "SHOP_CREATED" && typeof metadata.name === "string"
      ? metadata.name
      : null);
  return {
    action: t(actions[log.action]),
    summary,
    actor: log.actorName ?? t("Unavailable account"),
    entityType: t(entities[log.entityType]),
    entity:
      log.entityType === "ORDER"
        ? `${t("Order")} #${log.entityId.slice(0, 8)}${entityName ? ` · ${entityName}` : ""}`
        : (entityName ?? t("Unavailable record")),
    entityHref:
      log.entityName && log.entityType === "SHOP"
        ? `/admin/shops/${log.entityId}`
        : log.entityName && log.entityType === "USER"
          ? `/admin/users/${log.entityId}`
          : null,
  };
}
