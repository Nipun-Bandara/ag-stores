import { quantityMilli } from "@/lib/quantity";
import {
  minorUnitsToMoney,
  moneyToMinorUnits,
  multiplyMinorUnits,
} from "@/lib/money";

export function packedWeightValid(value: string | number): boolean {
  try {
    return quantityMilli(value) > BigInt(0);
  } catch {
    return false;
  }
}

export function weightDifferenceMilli(
  requested: string | number,
  packed: string | number,
): bigint {
  return quantityMilli(packed) - quantityMilli(requested);
}

export function exceedsWeightAllowance(
  requested: string | number,
  packed: string | number,
  allowancePercent: string,
): boolean {
  const difference = weightDifferenceMilli(requested, packed);
  const magnitude = difference < BigInt(0) ? -difference : difference;
  const [whole = "0", fraction = ""] = allowancePercent.split(".");
  const hundredths =
    BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return magnitude * BigInt(10_000) > quantityMilli(requested) * hundredths;
}

export function packedLineTotal(
  unitPrice: string,
  weight: string | number,
): string {
  return minorUnitsToMoney(
    multiplyMinorUnits(moneyToMinorUnits(unitPrice), Number(weight)),
  );
}

export function milliToDecimal(value: bigint): string {
  const magnitude = value < BigInt(0) ? -value : value;
  return `${value < BigInt(0) ? "-" : ""}${magnitude / BigInt(1000)}.${String(magnitude % BigInt(1000)).padStart(3, "0")}`;
}
