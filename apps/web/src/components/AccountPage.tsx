import { useState, useEffect } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { trpc } from "../lib/trpc";
import { createI18n } from "../lib/i18n";

interface Props {
  lang: "sv" | "en";
}

function AccountPageInner({ lang }: Props) {
  const { t } = useTranslation("common");
  const [user, setUser] = useState<{
    name: string;
    email: string;
    locale: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    trpc.auth.me
      .query()
      .then((data) => setUser(data))
      .catch(() => {
        window.location.href = `/${lang}/login`;
      });
  }, [lang]);

  const switchLocale = async (newLocale: "sv" | "en") => {
    setSaving(true);
    try {
      await trpc.auth.changeLocale.mutate({ locale: newLocale });
      window.location.href = `/${newLocale}/account`;
    } catch {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await trpc.auth.logout.mutate();
    window.location.href = `/${lang}/login`;
  };

  if (!user) {
    return (
      <div className="text-neutral-400">{t("loading")}</div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8 tracking-tight">
        {t("account")}
      </h1>

      <div className="bg-concrete-900 border border-concrete-800 rounded-lg p-6 space-y-6">
        <div>
          <label className="block font-bold text-neutral-200 mb-1 uppercase text-sm tracking-wide">
            {t("language")}
          </label>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => switchLocale("sv")}
              disabled={saving || user.locale === "sv"}
              className={`min-h-btn px-6 py-2 rounded font-bold transition-colors ${
                user.locale === "sv"
                  ? "bg-safety-500 text-concrete-950"
                  : "bg-concrete-800 text-neutral-200 hover:bg-concrete-700"
              } disabled:opacity-50`}
            >
              Svenska
            </button>
            <button
              onClick={() => switchLocale("en")}
              disabled={saving || user.locale === "en"}
              className={`min-h-btn px-6 py-2 rounded font-bold transition-colors ${
                user.locale === "en"
                  ? "bg-safety-500 text-concrete-950"
                  : "bg-concrete-800 text-neutral-200 hover:bg-concrete-700"
              } disabled:opacity-50`}
            >
              English
            </button>
          </div>
        </div>

        <hr className="border-concrete-700" />

        <button
          onClick={handleLogout}
          className="min-h-btn bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded transition-colors"
        >
          {t("logout")}
        </button>
      </div>
    </div>
  );
}

export default function AccountPage({ lang }: Props) {
  const i18n = createI18n(lang);
  return (
    <I18nextProvider i18n={i18n}>
      <AccountPageInner lang={lang} />
    </I18nextProvider>
  );
}
