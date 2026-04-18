export const VAT_RATES = [0.25, 0.12, 0.06, 0.0] as const;
export type VatRate = (typeof VAT_RATES)[number];

export const UNITS = [
  "mm",
  "cm",
  "m",
  "cl",
  "l",
  "g",
  "hg",
  "kg",
  "pcs",
  "h",
] as const;
export type Unit = (typeof UNITS)[number];

const UNIT_LABELS_SV: Partial<Record<Unit, string>> = { pcs: "st" };

export function unitLabel(unit: string, lang: "sv" | "en"): string {
  if (lang === "sv") return UNIT_LABELS_SV[unit as Unit] ?? unit;
  return unit;
}
