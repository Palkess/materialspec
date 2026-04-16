import { useState, useEffect } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { trpc } from "../lib/trpc";
import { createI18n } from "../lib/i18n";

interface Props {
  lang: "sv" | "en";
}

function AdminNavLinkInner({ lang }: Props) {
  const { t } = useTranslation("common");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    trpc.auth.me.query()
      .then((user) => setIsAdmin(user.isAdmin ?? false))
      .catch(() => {/* not authenticated */});
  }, []);

  if (!isAdmin) return null;

  return (
    <a
      href={`/${lang}/admin/users`}
      className="text-sm px-3 py-2 rounded text-neutral-200 hover:bg-concrete-800 hover:text-white font-bold uppercase tracking-wide transition-colors"
    >
      {t("admin")}
    </a>
  );
}

export default function AdminNavLink({ lang }: Props) {
  const i18n = createI18n(lang);
  return (
    <I18nextProvider i18n={i18n}>
      <AdminNavLinkInner lang={lang} />
    </I18nextProvider>
  );
}
