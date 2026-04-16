import { useState, useEffect } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { trpc } from "../lib/trpc";
import { createI18n } from "../lib/i18n";

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  locale: string;
  createdAt: Date | string;
}

interface Props {
  lang: "sv" | "en";
}

const t_admin = {
  sv: {
    title: "Användare",
    email: "E-post",
    name: "Namn",
    role: "Roll",
    created: "Skapad",
    admin: "Admin",
    user: "Användare",
    promote: "Gör till admin",
    demote: "Ta bort admin",
    resetLink: "Generera återställningslänk",
    linkGenerated: "Länk genererad! Kopiera:",
    lastAdmin: "Kan inte ta bort den sista administratören",
    actions: "Åtgärder",
  },
  en: {
    title: "Users",
    email: "Email",
    name: "Name",
    role: "Role",
    created: "Created",
    admin: "Admin",
    user: "User",
    promote: "Make admin",
    demote: "Remove admin",
    resetLink: "Generate reset link",
    linkGenerated: "Link generated! Copy:",
    lastAdmin: "Cannot remove the last administrator",
    actions: "Actions",
  },
};

function AdminUserListInner({ lang }: Props) {
  const labels = t_admin[lang];
  const { t: tCommon } = useTranslation("common");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetLinks, setResetLinks] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    trpc.admin.users.list
      .query()
      .then(setUsers)
      .catch(() => {
        window.location.href = `/${lang}/specs`;
      })
      .finally(() => setLoading(false));
  }, [lang]);

  const handleSetAdmin = async (userId: string, isAdmin: boolean) => {
    setError("");
    try {
      await trpc.admin.users.setAdmin.mutate({ userId, isAdmin });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isAdmin } : u))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("lastAdmin")) {
        setError(labels.lastAdmin);
      }
    }
  };

  const handleGenerateResetLink = async (userId: string) => {
    const result = await trpc.admin.users.generateResetLink.mutate({ userId });
    const url = `${window.location.origin}/${lang}/reset-password?token=${result.token}`;
    setResetLinks((prev) => ({ ...prev, [userId]: url }));
  };

  if (loading) {
    return <div className="text-neutral-400 text-center py-12">{tCommon("loading")}</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8 tracking-tight">
        {labels.title}
      </h1>

      {error && (
        <div className="bg-red-900/50 border-l-4 border-red-500 text-red-200 px-4 py-3 rounded mb-6 font-bold text-sm">
          {error}
        </div>
      )}

      <div className="bg-concrete-900 border border-concrete-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-concrete-700">
              <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {labels.email}
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {labels.name}
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {labels.role}
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {labels.created}
              </th>
              <th className="text-right px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {labels.actions}
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr
                key={user.id}
                className={`border-b border-concrete-800 ${
                  i % 2 === 1 ? "bg-concrete-800/30" : ""
                }`}
              >
                <td className="px-4 py-3 text-white">{user.email}</td>
                <td className="px-4 py-3 text-neutral-300">{user.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      user.isAdmin
                        ? "bg-safety-500/20 text-safety-400"
                        : "bg-concrete-700 text-neutral-400"
                    }`}
                  >
                    {user.isAdmin ? labels.admin : labels.user}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-400 text-sm">
                  {new Date(user.createdAt).toLocaleDateString(
                    lang === "sv" ? "sv-SE" : "en-US"
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end flex-wrap">
                    <button
                      onClick={() =>
                        handleSetAdmin(user.id, !user.isAdmin)
                      }
                      className="text-xs px-3 py-1 bg-concrete-800 hover:bg-concrete-700 text-neutral-300 rounded font-bold transition-colors"
                    >
                      {user.isAdmin ? labels.demote : labels.promote}
                    </button>
                    <button
                      onClick={() => handleGenerateResetLink(user.id)}
                      className="text-xs px-3 py-1 bg-concrete-800 hover:bg-concrete-700 text-neutral-300 rounded font-bold transition-colors"
                    >
                      {labels.resetLink}
                    </button>
                  </div>
                  {resetLinks[user.id] && (
                    <div className="mt-2 text-left">
                      <p className="text-xs text-safety-400 font-bold mb-1">
                        {labels.linkGenerated}
                      </p>
                      <input
                        type="text"
                        readOnly
                        value={resetLinks[user.id]}
                        className="w-full text-xs px-2 py-1 bg-concrete-800 border border-concrete-600 rounded text-white font-mono"
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminUserList({ lang }: Props) {
  const i18n = createI18n(lang);
  return (
    <I18nextProvider i18n={i18n}>
      <AdminUserListInner lang={lang} />
    </I18nextProvider>
  );
}
