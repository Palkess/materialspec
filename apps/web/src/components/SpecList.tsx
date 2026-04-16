import { useState, useEffect, useMemo } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { trpc } from "../lib/trpc";
import { createI18n } from "../lib/i18n";

interface Spec {
  id: string;
  name: string;
  responsiblePerson: string;
  updatedAt: Date | string;
  itemCount: number;
  grandTotal: string;
}

interface Props {
  lang: "sv" | "en";
}

function formatCurrency(value: string, lang: "sv" | "en"): string {
  const num = parseFloat(value);
  if (isNaN(num)) return lang === "sv" ? "0,00 kr" : "0.00 SEK";
  const formatted = num.toFixed(2);
  if (lang === "sv") {
    return formatted.replace(".", ",") + " kr";
  }
  return formatted + " SEK";
}

function formatDate(date: Date | string, lang: "sv" | "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getApiUrl(): string {
  return (
    (typeof window !== "undefined" &&
      (window as unknown as { __API_URL__?: string }).__API_URL__) ||
    "http://localhost:3002"
  );
}

function SpecListInner({ lang }: Props) {
  const { t } = useTranslation("specs");
  const { t: tCommon } = useTranslation("common");
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const apiUrl = getApiUrl();

  const loadSpecs = async () => {
    try {
      const data = await trpc.specs.list.query();
      setSpecs(data);
    } catch {
      window.location.href = `/${lang}/login`;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpecs();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return specs;
    const q = search.toLowerCase();
    return specs.filter((s) => s.name.toLowerCase().includes(q));
  }, [specs, search]);

  const handleDuplicate = async (id: string) => {
    await trpc.specs.duplicate.mutate({ id, locale: lang });
    await loadSpecs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("list.deleteConfirm"))) return;
    await trpc.specs.softDelete.mutate({ id });
    setSpecs((prev) => prev.filter((s) => s.id !== id));
  };

  if (loading) {
    return <div className="text-neutral-400 text-center py-12">{tCommon("loading")}</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          {t("list.title")}
        </h1>
        <a
          href={`/${lang}/specs/new`}
          className="min-h-btn inline-flex items-center bg-safety-500 hover:bg-safety-400 text-concrete-950 font-bold py-3 px-6 rounded transition-colors uppercase tracking-wide text-sm"
        >
          + {t("list.newSpec")}
        </a>
      </div>

      {specs.length > 0 && (
        <div className="mb-6">
          <label className="block font-bold text-neutral-200 mb-2 uppercase text-xs tracking-wide">
            {t("list.searchPlaceholder")}
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="..."
            className="w-full max-w-md px-4 py-3 bg-concrete-800 border border-concrete-600 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors"
          />
        </div>
      )}

      {specs.length === 0 ? (
        <div className="text-center py-20 bg-concrete-900 border border-concrete-800 rounded-lg">
          <p className="text-neutral-200 text-xl font-bold mb-3">
            {t("list.empty")}
          </p>
          <p className="text-neutral-500 mb-8">{t("list.emptyHint")}</p>
          <a
            href={`/${lang}/specs/new`}
            className="min-h-btn inline-flex items-center bg-safety-500 hover:bg-safety-400 text-concrete-950 font-bold py-3 px-8 rounded transition-colors uppercase tracking-wide"
          >
            + {t("list.newSpec")}
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-neutral-400">
          {tCommon("noResults")}
        </div>
      ) : (
        <div className="bg-concrete-900 border border-concrete-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-concrete-700">
                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  {t("list.columns.name")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                  {t("list.columns.responsiblePerson")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                  {t("list.columns.updatedAt")}
                </th>
                <th className="text-right px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  {t("list.columns.total")}
                </th>
                <th className="text-right px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  {t("list.columns.items")}
                </th>
                <th className="px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider text-right">
                  {tCommon("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((spec, i) => (
                <tr
                  key={spec.id}
                  className={`border-b border-concrete-800 hover:bg-concrete-700/30 transition-colors ${
                    i % 2 === 1 ? "bg-concrete-800/40" : ""
                  }`}
                >
                  <td className="px-4 py-4">
                    <a
                      href={`/${lang}/specs/${spec.id}/edit`}
                      className="text-white font-bold hover:text-safety-400 transition-colors"
                    >
                      {spec.name}
                    </a>
                  </td>
                  <td className="px-4 py-4 text-neutral-400 hidden md:table-cell">
                    {spec.responsiblePerson || "\u2014"}
                  </td>
                  <td className="px-4 py-4 text-neutral-400 text-sm hidden sm:table-cell">
                    {formatDate(spec.updatedAt, lang)}
                  </td>
                  <td className="px-4 py-4 text-right text-white font-mono text-sm">
                    {formatCurrency(spec.grandTotal, lang)}
                  </td>
                  <td className="px-4 py-4 text-right text-neutral-400">
                    {spec.itemCount}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex gap-2 justify-end flex-wrap">
                      <a
                        href={`${apiUrl}/specs/${spec.id}/export.xlsx?lang=${lang}`}
                        className="text-xs px-3 py-2 bg-concrete-800 hover:bg-concrete-700 text-neutral-200 rounded font-bold uppercase tracking-wide transition-colors"
                      >
                        {t("list.exportXlsx")}
                      </a>
                      <a
                        href={`${apiUrl}/specs/${spec.id}/export.pdf?lang=${lang}`}
                        className="text-xs px-3 py-2 bg-concrete-800 hover:bg-concrete-700 text-neutral-200 rounded font-bold uppercase tracking-wide transition-colors"
                      >
                        {t("list.exportPdf")}
                      </a>
                      <button
                        onClick={() => handleDuplicate(spec.id)}
                        className="text-xs px-3 py-2 bg-concrete-800 hover:bg-concrete-700 text-neutral-200 rounded font-bold uppercase tracking-wide transition-colors"
                      >
                        {t("list.duplicate")}
                      </button>
                      <button
                        onClick={() => handleDelete(spec.id)}
                        className="text-xs px-3 py-2 bg-red-900/50 hover:bg-red-700/50 text-red-300 hover:text-red-200 rounded font-bold uppercase tracking-wide transition-colors"
                      >
                        {t("list.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SpecList({ lang }: Props) {
  const i18n = createI18n(lang);
  return (
    <I18nextProvider i18n={i18n}>
      <SpecListInner lang={lang} />
    </I18nextProvider>
  );
}
