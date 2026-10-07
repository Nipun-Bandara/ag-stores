import { calculateDistance } from "@/services/geographic-distance.service";

export interface RoutingCoordinate {
  latitude: number;
  longitude: number;
}

export interface DeliveryRoutingCandidate extends RoutingCoordinate {
  orderId: string;
}

export interface DeliveryRoutingInput {
  shop: RoutingCoordinate;
  orders: readonly DeliveryRoutingCandidate[];
}

export interface SuggestedDeliveryGroup {
  id: string;
  direction: string;
  orderIds: string[];
  maximumPairDistanceKm: number;
}

export interface DeliveryRoutingSuggestion {
  groups: SuggestedDeliveryGroup[];
  ungroupedOrderIds: string[];
  invalidOrderIds: string[];
  shopCoordinatesValid: boolean;
  method: "BASIC_GEOGRAPHIC_GROUPING";
}

export interface DeliveryRoutingEngine {
  suggest(input: DeliveryRoutingInput): DeliveryRoutingSuggestion;
}

export interface BasicGeographicRoutingOptions {
  maximumPairDistanceKm: number;
  maximumBearingDifferenceDegrees: number;
}

export const DEFAULT_BASIC_ROUTING_OPTIONS: BasicGeographicRoutingOptions = {
  maximumPairDistanceKm: 5,
  maximumBearingDifferenceDegrees: 45,
};

interface PreparedCandidate extends DeliveryRoutingCandidate {
  bearing: number;
  distanceFromShopKm: number;
}

function coordinatesAreValid({
  latitude,
  longitude,
}: RoutingCoordinate): boolean {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function degrees(value: number): number {
  return (value * 180) / Math.PI;
}

function calculateBearing(
  origin: RoutingCoordinate,
  destination: RoutingCoordinate,
): number {
  const originLatitude = radians(origin.latitude);
  const destinationLatitude = radians(destination.latitude);
  const longitudeDelta = radians(destination.longitude - origin.longitude);
  const y = Math.sin(longitudeDelta) * Math.cos(destinationLatitude);
  const x =
    Math.cos(originLatitude) * Math.sin(destinationLatitude) -
    Math.sin(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.cos(longitudeDelta);
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

function bearingDifference(first: number, second: number): number {
  const difference = Math.abs(first - second) % 360;
  return Math.min(difference, 360 - difference);
}

function directionLabel(bearing: number): string {
  const labels = [
    "North",
    "Northeast",
    "East",
    "Southeast",
    "South",
    "Southwest",
    "West",
    "Northwest",
  ] as const;
  return labels[Math.round(bearing / 45) % labels.length]!;
}

function pairDistance(
  first: DeliveryRoutingCandidate,
  second: DeliveryRoutingCandidate,
): number {
  return calculateDistance(
    first.latitude,
    first.longitude,
    second.latitude,
    second.longitude,
  );
}

function maximumPairDistance(group: readonly PreparedCandidate[]): number {
  let maximum = 0;
  for (let first = 0; first < group.length; first += 1) {
    for (let second = first + 1; second < group.length; second += 1) {
      maximum = Math.max(maximum, pairDistance(group[first]!, group[second]!));
    }
  }
  return maximum;
}

function roundsToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export class BasicGeographicRoutingEngine implements DeliveryRoutingEngine {
  constructor(
    private readonly options: BasicGeographicRoutingOptions = DEFAULT_BASIC_ROUTING_OPTIONS,
  ) {}

  suggest(input: DeliveryRoutingInput): DeliveryRoutingSuggestion {
    const uniqueOrders = Array.from(
      new Map(input.orders.map((order) => [order.orderId, order])).values(),
    );
    const invalidOrderIds = uniqueOrders
      .filter((order) => !coordinatesAreValid(order))
      .map(({ orderId }) => orderId)
      .sort();
    const validOrders = uniqueOrders.filter(coordinatesAreValid);

    if (!coordinatesAreValid(input.shop)) {
      return {
        groups: [],
        ungroupedOrderIds: validOrders.map(({ orderId }) => orderId).sort(),
        invalidOrderIds,
        shopCoordinatesValid: false,
        method: "BASIC_GEOGRAPHIC_GROUPING",
      };
    }

    const prepared = validOrders
      .map((order): PreparedCandidate => ({
        ...order,
        bearing: calculateBearing(input.shop, order),
        distanceFromShopKm: calculateDistance(
          input.shop.latitude,
          input.shop.longitude,
          order.latitude,
          order.longitude,
        ),
      }))
      .sort(
        (first, second) =>
          first.distanceFromShopKm - second.distanceFromShopKm ||
          first.bearing - second.bearing ||
          first.orderId.localeCompare(second.orderId),
      );

    const candidateGroups: PreparedCandidate[][] = [];
    for (const candidate of prepared) {
      const matchingGroup = candidateGroups.find((group) =>
        group.every(
          (member) =>
            bearingDifference(member.bearing, candidate.bearing) <=
              this.options.maximumBearingDifferenceDegrees &&
            pairDistance(member, candidate) <=
              this.options.maximumPairDistanceKm,
        ),
      );
      if (matchingGroup) matchingGroup.push(candidate);
      else candidateGroups.push([candidate]);
    }

    const grouped = candidateGroups.filter((group) => group.length > 1);
    const ungroupedOrderIds = candidateGroups
      .filter((group) => group.length === 1)
      .map((group) => group[0]!.orderId)
      .sort();

    return {
      groups: grouped.map((group, index) => ({
        id: `suggested-group-${index + 1}`,
        direction: directionLabel(group[0]!.bearing),
        orderIds: group.map(({ orderId }) => orderId),
        maximumPairDistanceKm: roundsToOneDecimal(maximumPairDistance(group)),
      })),
      ungroupedOrderIds,
      invalidOrderIds,
      shopCoordinatesValid: true,
      method: "BASIC_GEOGRAPHIC_GROUPING",
    };
  }
}

const basicGeographicRoutingEngine = new BasicGeographicRoutingEngine();

export function suggestDeliveryGroups(
  input: DeliveryRoutingInput,
  engine: DeliveryRoutingEngine = basicGeographicRoutingEngine,
): DeliveryRoutingSuggestion {
  return engine.suggest(input);
}
