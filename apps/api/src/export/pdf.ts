import PDFDocument from "pdfkit";
import Decimal from "decimal.js";
import { lineTotal, grandTotals, roundForDisplay, unitLabel } from "@materialspec/shared";

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

// Layout constants
const L = 50;           // left margin
const R = 545;          // right margin
const ROW_H = 16;       // row height (px)
const LINE_GAP = 4;     // gap between line and text

// Column x-positions: Name | Qty | Unit | VAT% | Price | Tax | Total
const COLS = [50, 195, 240, 295, 345, 415, 475];

export async function renderPdf(
  spec: ExportSpec,
  items: ExportItem[],
  lang: "sv" | "en"
): Promise<Buffer> {
  const t = translations[lang];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: L });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Header block ──────────────────────────────────────────
    doc.fontSize(20).font("Helvetica-Bold").text(t.title, L, 50);
    doc.moveDown(0.4);
    doc.fontSize(14).font("Helvetica-Bold").text(spec.name);
    if (spec.description) {
      doc.fontSize(10).font("Helvetica").text(spec.description);
    }
    doc.fontSize(10).font("Helvetica")
      .text(`${t.responsiblePerson}: ${spec.responsiblePerson}`)
      .text(`${t.generatedAt}: ${new Date().toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US")}`);
    doc.moveDown(0.8);

    // ── Table header row ──────────────────────────────────────
    const headers = [
      t.columns.name,
      t.columns.quantity,
      t.columns.unit,
      t.columns.vatRate,
      t.columns.pricePerUnit,
      t.columns.tax,
      t.columns.total,
    ];

    let y = doc.y;

    // Top border
    doc.moveTo(L, y).lineTo(R, y).stroke();
    y += LINE_GAP;

    // Header text
    doc.fontSize(8).font("Helvetica-Bold");
    headers.forEach((h, i) => {
      const colW = (COLS[i + 1] ?? R) - COLS[i] - 3;
      const align = i === 0 || i === 2 ? "left" : "right";
      doc.text(h, COLS[i], y, { width: colW, align, lineBreak: false });
    });
    y += ROW_H;

    // Header bottom border
    doc.moveTo(L, y).lineTo(R, y).stroke();
    y += LINE_GAP;

    // ── Item rows ─────────────────────────────────────────────
    doc.fontSize(8).font("Helvetica");
    for (const item of items) {
      const line = lineTotal(item);
      const cells = [
        item.name,
        fmtNum(item.quantity, lang),
        unitLabel(item.unit, lang),
        `${(parseFloat(item.taxRate) * 100).toFixed(0)} %`,
        fmtCurrency(roundForDisplay(new Decimal(item.pricePerUnit)), lang),
        fmtCurrency(roundForDisplay(line.tax), lang),
        fmtCurrency(roundForDisplay(line.gross), lang),
      ];

      cells.forEach((cell, i) => {
        const colW = (COLS[i + 1] ?? R) - COLS[i] - 3;
        const align = i === 0 || i === 2 ? "left" : "right";
        doc.text(cell, COLS[i], y, { width: colW, align, lineBreak: false });
      });
      y += ROW_H;
    }

    // Bottom border
    doc.moveTo(L, y).lineTo(R, y).stroke();
    y += 14;

    // ── Totals section ────────────────────────────────────────
    // Two-column layout: label (left) | value (right-aligned)
    const totals = grandTotals(items);
    const labelX = L;
    const labelW = 280;
    const valueX = 340;
    const valueW = R - valueX;

    function totalsRow(label: string, value: string, bold = false, largeFontSize = 9) {
      doc.fontSize(largeFontSize).font(bold ? "Helvetica-Bold" : "Helvetica");
      doc.text(label, labelX, y, { width: labelW, lineBreak: false });
      doc.text(value, valueX, y, { width: valueW, align: "right", lineBreak: false });
      y += largeFontSize + 5;
    }

    doc.fontSize(9).font("Helvetica");
    for (const group of totals.groups) {
      const label = t.totals.vatGroup.replace("{{rate}}", group.ratePercent);
      const value = fmtCurrency(roundForDisplay(group.tax), lang);
      totalsRow(label, value);
    }

    y += 4; // small gap before summary

    totalsRow(t.totals.subtotal, fmtCurrency(roundForDisplay(totals.net), lang), true);
    totalsRow(t.totals.vat, fmtCurrency(roundForDisplay(totals.tax), lang), true);

    // Grand total separator line
    doc.moveTo(valueX, y).lineTo(R, y).stroke();
    y += 4;

    totalsRow(t.totals.grandTotal, fmtCurrency(roundForDisplay(totals.gross), lang), true, 11);

    doc.end();
  });
}
