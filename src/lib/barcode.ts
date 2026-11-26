export function isGtinCandidate(value: string): boolean {
  const code = value.trim();

  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) {
    return false;
  }

  const body = code.slice(0, -1);
  let sum = 0;

  for (let i = body.length - 1, weight = 3; i >= 0; i--) {
    sum += Number(body[i]) * weight;
    weight = weight === 3 ? 1 : 3;
  }

  const expected = (10 - (sum % 10)) % 10;
  return expected === Number(code.at(-1));
}
