import { quantityMilli } from "@/lib/quantity";

const DECIMAL_MONEY = /^(\d+)\.(\d{2})$/;

function trimLeadingZeroes(value: string): string {
  return value.replace(/^0+(?=\d)/, "");
}

export function moneyToMinorUnits(value: string): string {
  const match = DECIMAL_MONEY.exec(value);
  if (!match) throw new Error("Money must use exactly two decimal places.");

  return trimLeadingZeroes(`${match[1] ?? "0"}${match[2] ?? "00"}`);
}

export function addMinorUnits(left: string, right: string): string {
  let carry = 0;
  let result = "";
  let leftIndex = left.length - 1;
  let rightIndex = right.length - 1;
  while (leftIndex >= 0 || rightIndex >= 0 || carry > 0) {
    const sum =
      Number(left[leftIndex] ?? 0) + Number(right[rightIndex] ?? 0) + carry;
    result = `${sum % 10}${result}`;
    carry = Math.floor(sum / 10);
    leftIndex -= 1;
    rightIndex -= 1;
  }
  return trimLeadingZeroes(result);
}

export function multiplyMinorUnits(value: string, quantity: number): string {
  // Round each non-negative line half up to cents before adding lines.
  const scaled = quantityMilli(quantity);
  return ((BigInt(value) * scaled + BigInt(500)) / BigInt(1000)).toString();
}

export function minorUnitsToMoney(value: string): string {
  const padded = trimLeadingZeroes(value).padStart(3, "0");
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
}
