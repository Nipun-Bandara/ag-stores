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
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new Error("Quantity must be a non-negative safe integer.");
  }
  let result = "0";
  let addend = value;
  let multiplier = quantity;
  while (multiplier > 0) {
    if (multiplier % 2 === 1) result = addMinorUnits(result, addend);
    addend = addMinorUnits(addend, addend);
    multiplier = Math.floor(multiplier / 2);
  }
  return result;
}

export function minorUnitsToMoney(value: string): string {
  const padded = trimLeadingZeroes(value).padStart(3, "0");
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
}
