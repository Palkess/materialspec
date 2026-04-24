import { useState, useEffect } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { trpc } from "../lib/trpc";
import { createI18n } from "../lib/i18n";
import { useAuthGuard } from "../lib/useAuthGuard";

interface Props {
  lang: "sv" | "en";
}

function AdminSettingsInner({ lang }: Props) {
  const { t: tAdmin } = useTranslation("admin");
  const { checking, user } = useAuthGuard(lang);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (checking) return;
    if (!user?.isAdmin) {
      window.location.href = `/${lang}/specs`;
      return;
    }
    trpc.admin.settings.getAll
      .query()
      .then((s) => setSignupEnabled(s.signupEnabled))
      .catch(() => {
        window.location.href = `/${lang}/specs`;
      })
      .finally(() => setLoading(false));
  }, [checking, user, lang]);

  const handleToggle = async (enabled: boolean) => {
    setError("");
    setSaved(false);
    try {
      await trpc.admin.settings.setSignupEnabled.mutate({ enabled });
      setSignupEnabled(enabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(tAdmin("settings.saved"));
    }
  };

  if (checking || loading) {
    return (
      <div className="p-8 text-neutral-400">{" "}</div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8 tracking-tight uppercase">
        {tAdmin("settings.title")}
      </h1>

      {error && (
        <div className="bg-red-900/50 border-l-4 border-red-500 text-red-200 px-4 py-3 rounded mb-6 font-bold text-sm">
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-900/50 border-l-4 border-green-500 text-green-200 px-4 py-3 rounded mb-6 font-bold text-sm">
          {tAdmin("settings.saved")}
        </div>
      )}

      <div className="bg-concrete-900 border border-concrete-800 rounded-lg p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-white uppercase tracking-wide text-sm">
              {tAdmin("settings.signupEnabled.label")}
            </p>
            <p className="text-neutral-400 text-sm mt-1">
              {tAdmin("settings.signupEnabled.description")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={signupEnabled}
            onClick={() => handleToggle(!signupEnabled)}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-safety-500 focus:ring-offset-2 focus:ring-offset-concrete-950 ${
              signupEnabled ? "bg-safety-500" : "bg-concrete-700"
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                signupEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSettings({ lang }: Props) {
  const i18n = createI18n(lang);
  return (
    <I18nextProvider i18n={i18n}>
      <AdminSettingsInner lang={lang} />
    </I18nextProvider>
  );
}
