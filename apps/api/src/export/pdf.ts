import PDFDocument from "pdfkit";
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

export async function renderPdf(
  spec: ExportSpec,
  items: ExportItem[],
  lang: "sv" | "en"
): Promise<Buffer> {
  const t = translations[lang];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Title
    doc.fontSize(20).font("Helvetica-Bold").text(t.title);
    doc.moveDown(0.5);

    // Spec info
    doc.fontSize(14).font("Helvetica-Bold").text(spec.name);
    if (spec.description) {
      doc.fontSize(10).font("Helvetica").text(spec.description);
    }
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`${t.responsiblePerson}: ${spec.responsiblePerson}`);
    doc.text(
      `${t.generatedAt}: ${new Date().toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US")}`
    );
    doc.moveDown();

    // Table header
    const cols = [50, 180, 280, 320, 370, 420, 480];
    const headers = [
      t.columns.name,
      t.columns.unit,
      t.columns.quantity,
      t.columns.pricePerUnit,
      t.columns.vatRate,
      t.columns.tax,
      t.columns.total,
    ];

    doc.fontSize(8).font("Helvetica-Bold");
    const headerY = doc.y;
    headers.forEach((h, i) => {
      doc.text(h, cols[i], headerY, { width: (cols[i + 1] || 550) - cols[i] });
    });
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(0.3);

    // Item rows
    doc.font("Helvetica").fontSize(8);
    for (const item of items) {
      const line = lineTotal(item);
      const y = doc.y;
      doc.text(item.name, cols[0], y, { width: cols[1] - cols[0] - 5 });
      doc.text(item.unit, cols[1], y, { width: cols[2] - cols[1] - 5 });
      doc.text(fmtNum(item.quantity, lang), cols[2], y, {
        width: cols[3] - cols[2] - 5,
      });
      doc.text(fmtCurrency(roundForDisplay(item.pricePerUnit), lang), cols[3], y, {
        width: cols[4] - cols[3] - 5,
      });
      doc.text(`${(parseFloat(item.taxRate) * 100).toFixed(0)} %`, cols[4], y, {
        width: cols[5] - cols[4] - 5,
      });
      doc.text(fmtCurrency(roundForDisplay(line.tax), lang), cols[5], y, {
        width: cols[6] - cols[5] - 5,
      });
      doc.text(fmtCurrency(roundForDisplay(line.gross), lang), cols[6], y, {
        width: 550 - cols[6],
      });
      doc.moveDown(0.3);
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Totals
    const totals = grandTotals(items);
    doc.font("Helvetica").fontSize(9);
    for (const group of totals.groups) {
      doc.text(
        `${t.totals.vatGroup.replace("{{rate}}", group.ratePercent)}: ${fmtCurrency(roundForDisplay(group.net), lang)} + ${fmtCurrency(roundForDisplay(group.tax), lang)}`
      );
    }

    doc.moveDown(0.3);
    doc
      .font("Helvetica-Bold")
      .text(
        `${t.totals.subtotal}: ${fmtCurrency(roundForDisplay(totals.net), lang)}`
      );
    doc.text(
      `${t.totals.vat}: ${fmtCurrency(roundForDisplay(totals.tax), lang)}`
    );
    doc
      .fontSize(12)
      .text(
        `${t.totals.grandTotal}: ${fmtCurrency(roundForDisplay(totals.gross), lang)}`
      );

    doc.end();
  });
}
