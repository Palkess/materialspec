import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { grandTotals, roundForDisplay } from "@materialspec/shared";
import type { ItemForCalc } from "@materialspec/shared";

interface Props {
  items: ItemForCalc[];
  lang: "sv" | "en";
}

function formatMoney(value: string, lang: "sv" | "en"): string {
  if (lang === "sv") {
    return value.replace(".", ",") + " kr";
  }
  return value + " SEK";
}

export default function TotalsFooter({ items, lang }: Props) {
  const { t } = useTranslation("specs");

  const totals = useMemo(() => {
    const validItems = items.filter(
      (i) => i.quantity && i.pricePerUnit && i.taxRate
    );
    return grandTotals(validItems);
  }, [items]);

  return (
    <div className="bg-concrete-900 border border-concrete-800 rounded-lg p-6">
      <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wide mb-4">
        {t("editor.totals.title")}
      </h3>

      <div className="space-y-2">
        {totals.groups.map((group) => (
          <div
            key={group.rate}
            className="flex justify-between text-sm text-neutral-400"
          >
            <span>
              {t("editor.totals.vatGroup", { rate: group.ratePercent })}
            </span>
            <span className="font-mono">
              {formatMoney(roundForDisplay(group.net), lang)} +{" "}
              {formatMoney(roundForDisplay(group.tax), lang)}
            </span>
          </div>
        ))}

        <hr className="border-concrete-700 my-3" />

        <div className="flex justify-between text-sm text-neutral-200">
          <span className="font-bold">{t("editor.totals.subtotal")}</span>
          <span className="font-mono font-bold">
            {formatMoney(roundForDisplay(totals.net), lang)}
          </span>
        </div>

        <div className="flex justify-between text-sm text-neutral-200">
          <span className="font-bold">{t("editor.totals.vat")}</span>
          <span className="font-mono font-bold">
            {formatMoney(roundForDisplay(totals.tax), lang)}
          </span>
        </div>

        <hr className="border-concrete-700 my-3" />

        <div className="flex justify-between text-lg text-white bg-concrete-800 -mx-6 px-6 py-3 rounded-b-lg">
          <span className="font-bold uppercase tracking-wide">{t("editor.totals.grandTotal")}</span>
          <span className="font-mono font-bold text-safety-500 text-xl">
            {formatMoney(roundForDisplay(totals.gross), lang)}
          </span>
        </div>
      </div>
    </div>
  );
}
