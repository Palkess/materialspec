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
