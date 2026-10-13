/**
 * Display formatting shared across every screen.
 *
 * These were previously re-declared inline in a dozen components, which is how
 * the same weight ended up rendered as "50kg", "50 kg" and "50" on three
 * different screens.
 */

/** Everything in BhumiSaara is weighed in kilograms; one token is one kg. */
export const formatKg = (kg: number | null | undefined) =>
  `${Math.round(Number(kg ?? 0)).toLocaleString()} kg`;

/** Tonnes are only ever a hint alongside the real kg figure. */
export const formatTonnes = (kg: number | null | undefined) =>
  `${(Number(kg ?? 0) / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} MT`;

export const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

export const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";

/** `0x1234…abcd` — enough to eyeball a match without wrapping the layout. */
export const truncateAddress = (address: string | null | undefined) =>
  address && address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address ?? "—";

/** Transaction hashes are longer, so they keep a slightly wider head. */
export const truncateHash = (hash: string | null | undefined) =>
  hash && hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash ?? "—";
