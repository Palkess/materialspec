import Decimal from "decimal.js";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export interface ItemForCalc {
  quantity: string;
  pricePerUnit: string;
  taxRate: string;
}

export interface LineTotals {
  net: Decimal;
  tax: Decimal;
  gross: Decimal;
}

export interface VatGroupTotal {
  rate: string;
  ratePercent: string;
  net: Decimal;
  tax: Decimal;
  gross: Decimal;
}

export interface GrandTotals {
  net: Decimal;
  tax: Decimal;
  gross: Decimal;
  groups: VatGroupTotal[];
}

/** Compute line-level totals with full precision. */
export function lineTotal(item: ItemForCalc): LineTotals {
  const qty = new Decimal(item.quantity || "0");
  const price = new Decimal(item.pricePerUnit || "0");
  const rate = new Decimal(item.taxRate || "0");

  const net = qty.times(price);
  const tax = net.times(rate);
  const gross = net.plus(tax);

  return { net, tax, gross };
}

/** Round a Decimal to 2 decimal places for display/export. */
export function roundForDisplay(value: Decimal): string {
  return value.toFixed(2);
}

/** Compute grouped and grand totals from an array of items. */
export function grandTotals(items: ItemForCalc[]): GrandTotals {
  const groups = new Map<
    string,
    { net: Decimal; tax: Decimal; gross: Decimal }
  >();

  let totalNet = new Decimal(0);
  let totalTax = new Decimal(0);
  let totalGross = new Decimal(0);

  for (const item of items) {
    const line = lineTotal(item);
    const rateKey = item.taxRate || "0";

    const existing = groups.get(rateKey) || {
      net: new Decimal(0),
      tax: new Decimal(0),
      gross: new Decimal(0),
    };

    existing.net = existing.net.plus(line.net);
    existing.tax = existing.tax.plus(line.tax);
    existing.gross = existing.gross.plus(line.gross);
    groups.set(rateKey, existing);

    totalNet = totalNet.plus(line.net);
    totalTax = totalTax.plus(line.tax);
    totalGross = totalGross.plus(line.gross);
  }

  const sortedGroups: VatGroupTotal[] = Array.from(groups.entries())
    .sort(([a], [b]) => new Decimal(b).minus(new Decimal(a)).toNumber())
    .map(([rate, totals]) => ({
      rate,
      ratePercent: new Decimal(rate).times(100).toString(),
      ...totals,
    }));

  return {
    net: totalNet,
    tax: totalTax,
    gross: totalGross,
    groups: sortedGroups,
  };
}
