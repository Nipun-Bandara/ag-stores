import { getDb } from "@/db";
import { UserRole } from "@/generated/prisma/client";
import {
  PrismaDeliveryOrderRepository,
  type AvailableDeliveryOrderRecord,
  type DeliveryOrderRepository,
  type DeliveryShopAssignment,
} from "@/repositories/delivery-order.repository";
import type { AuthenticatedUser } from "@/types/auth";
import type { AvailableDeliveryOrderFilters } from "@/validations/delivery-order";

type DeliveryOrderErrorCode = "DELIVERY_ONLY" | "SHOP_ASSIGNMENT_REQUIRED";

export class DeliveryOrderError extends Error {
  constructor(
    readonly code: DeliveryOrderErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DeliveryOrderError";
  }
}

function repository(): DeliveryOrderRepository {
  return new PrismaDeliveryOrderRepository(getDb());
}

export function calculateDistanceKm(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
): number {
  const radiusKm = 6_371;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(destination.latitude - origin.latitude);
  const longitudeDelta = radians(destination.longitude - origin.longitude);
  const startLatitude = radians(origin.latitude);
  const endLatitude = radians(destination.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    radiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function toGeneralDeliveryArea(address: string): string {
  const segments = address
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments.length >= 2
    ? segments.slice(-2).join(", ")
    : "Area unavailable";
}

function toAvailableOrderView(
  order: AvailableDeliveryOrderRecord,
  shop: NonNullable<DeliveryShopAssignment>,
) {
  const distanceKm = calculateDistanceKm(
    {
      latitude: Number(shop.latitude),
      longitude: Number(shop.longitude),
    },
    {
      latitude: Number(order.deliveryAddress.latitude),
      longitude: Number(order.deliveryAddress.longitude),
    },
  );

  return {
    id: order.id,
    deliveryArea: toGeneralDeliveryArea(order.deliveryAddress.address),
    distanceKm: Math.round(distanceKm * 10) / 10,
    itemCount: order._count.items,
    total: order.total.toFixed(2),
    createdAt: order.createdAt.toISOString(),
  };
}

export async function listAvailableDeliveryOrders(
  user: AuthenticatedUser,
  filters: AvailableDeliveryOrderFilters,
  orders: DeliveryOrderRepository = repository(),
) {
  if (user.role !== UserRole.DELIVERY_PERSON) {
    throw new DeliveryOrderError(
      "DELIVERY_ONLY",
      "Delivery personnel access is required.",
      403,
    );
  }

  const shop = await orders.findAssignedShop(user.id);
  if (!shop) {
    throw new DeliveryOrderError(
      "SHOP_ASSIGNMENT_REQUIRED",
      "A shop assignment is required to view available orders.",
      409,
    );
  }

  const createdAfter = filters.createdAfter
    ? new Date(`${filters.createdAfter}T00:00:00.000+05:30`)
    : undefined;
  const availableOrders = (
    await orders.findAvailableOrders(shop.id, createdAfter)
  )
    .map((order) => toAvailableOrderView(order, shop))
    .filter(
      (order) =>
        filters.maxDistanceKm === undefined ||
        order.distanceKm <= filters.maxDistanceKm,
    )
    .sort((left, right) => {
      const comparison =
        filters.sortBy === "distance"
          ? left.distanceKm - right.distanceKm
          : new Date(left.createdAt).getTime() -
            new Date(right.createdAt).getTime();
      return filters.direction === "asc" ? comparison : -comparison;
    });

  return {
    shop: { id: shop.id, name: shop.name },
    orders: availableOrders,
  };
}

export type AvailableDeliveryOrdersView = Awaited<
  ReturnType<typeof listAvailableDeliveryOrders>
>;
