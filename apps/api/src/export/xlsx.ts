import ExcelJS from "exceljs";
import Decimal from "decimal.js";
import { lineTotal, grandTotals, roundForDisplay } from "@materialspec/shared";

import svExport from "@materialspec/shared/i18n/sv/export.json" with { type: "json" };
import enExport from "@materialspec/shared/i18n/en/export.json" with { type: "json" };

interface ExportSpec {
  name: string;
  description: string;
  responsiblePerson: string;
}

interface ExportItem {
  name: string;
  description: string;
  unit: string;
  quantity: string;
  pricePerUnit: string;
  taxRate: string;
}

const translations = { sv: svExport, en: enExport };

function fmtNum(value: string, lang: "sv" | "en"): string {
  if (lang === "sv") return value.replace(".", ",");
  return value;
}

function fmtCurrency(value: string, lang: "sv" | "en"): string {
  const formatted = fmtNum(value, lang);
  return lang === "sv" ? `${formatted} kr` : `${formatted} SEK`;
}

export async function renderXlsx(
  spec: ExportSpec,
  items: ExportItem[],
  lang: "sv" | "en"
): Promise<Buffer> {
  const t = translations[lang];
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(spec.name);

  // Header block
  ws.addRow([t.title]);
  ws.getRow(1).font = { bold: true, size: 16 };
  ws.addRow([]);
  ws.addRow([spec.name]);
  ws.getRow(3).font = { bold: true, size: 14 };
  if (spec.description) {
    ws.addRow([spec.description]);
  }
  ws.addRow([`${t.responsiblePerson}: ${spec.responsiblePerson}`]);
  ws.addRow([
    `${t.generatedAt}: ${new Date().toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US")}`,
  ]);
  ws.addRow([]);

  // Column headers
  const headerRow = ws.addRow([
    t.columns.name,
    t.columns.description,
    t.columns.unit,
    t.columns.quantity,
    t.columns.pricePerUnit,
    t.columns.vatRate,
    t.columns.tax,
    t.columns.total,
  ]);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2D2D2D" },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  // Item rows
  for (const item of items) {
    const line = lineTotal(item);
    ws.addRow([
      item.name,
      item.description,
      item.unit,
      fmtNum(item.quantity, lang),
      fmtCurrency(roundForDisplay(new Decimal(item.pricePerUnit)), lang),
      `${(parseFloat(item.taxRate) * 100).toFixed(0)} %`,
      fmtCurrency(roundForDisplay(line.tax), lang),
      fmtCurrency(roundForDisplay(line.gross), lang),
    ]);
  }

  ws.addRow([]);

  // Totals footer
  const totals = grandTotals(items);
  for (const group of totals.groups) {
    ws.addRow([
      `${t.totals.vatGroup.replace("{{rate}}", group.ratePercent)}`,
      "",
      "",
      "",
      "",
      "",
      fmtCurrency(roundForDisplay(group.tax), lang),
      "",
    ]);
  }

  const netRow = ws.addRow([
    t.totals.subtotal,
    "",
    "",
    "",
    "",
    "",
    "",
    fmtCurrency(roundForDisplay(totals.net), lang),
  ]);
  netRow.font = { bold: true };

  const vatRow = ws.addRow([
    t.totals.vat,
    "",
    "",
    "",
    "",
    "",
    "",
    fmtCurrency(roundForDisplay(totals.tax), lang),
  ]);
  vatRow.font = { bold: true };

  const grandRow = ws.addRow([
    t.totals.grandTotal,
    "",
    "",
    "",
    "",
    "",
    "",
    fmtCurrency(roundForDisplay(totals.gross), lang),
  ]);
  grandRow.font = { bold: true, size: 14 };

  // Column widths
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 30;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 15;
  ws.getColumn(6).width = 10;
  ws.getColumn(7).width = 15;
  ws.getColumn(8).width = 15;

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
