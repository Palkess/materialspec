import React, { useState, useEffect } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { trpc } from "../lib/trpc";
import { createI18n } from "../lib/i18n";
import { useAuthGuard } from "../lib/useAuthGuard";

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

interface Spec {
  id: string;
  name: string;
}

function AdminUserListInner({ lang }: Props) {
  const { t: tAdmin } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const { checking } = useAuthGuard(lang);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetLinks, setResetLinks] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userSpecs, setUserSpecs] = useState<Record<string, Spec[]>>({});
  const [selectedSpecs, setSelectedSpecs] = useState<Set<string>>(new Set());
  const [reassignTarget, setReassignTarget] = useState<string>("");
  const [reassigning, setReassigning] = useState(false);

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
        setError(tAdmin("lastAdmin"));
      }
    }
  };

  const handleGenerateResetLink = async (userId: string) => {
    const result = await trpc.admin.users.generateResetLink.mutate({ userId });
    const url = `${window.location.origin}/${lang}/reset-password?token=${result.token}`;
    setResetLinks((prev) => ({ ...prev, [userId]: url }));
  };

  const handleToggleSpecs = async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      setSelectedSpecs(new Set());
      setReassignTarget("");
      return;
    }
    setExpandedUser(userId);
    setSelectedSpecs(new Set());
    setReassignTarget("");
    if (!userSpecs[userId]) {
      const specs = await trpc.admin.specs.listByUser.query({ userId });
      setUserSpecs((prev) => ({ ...prev, [userId]: specs }));
    }
  };

  const handleToggleSpec = (specId: string) => {
    setSelectedSpecs((prev) => {
      const next = new Set(prev);
      if (next.has(specId)) {
        next.delete(specId);
      } else {
        next.add(specId);
      }
      return next;
    });
  };

  const handleSelectAll = (userId: string) => {
    const specs = userSpecs[userId] || [];
    if (selectedSpecs.size === specs.length) {
      setSelectedSpecs(new Set());
    } else {
      setSelectedSpecs(new Set(specs.map((s) => s.id)));
    }
  };

  const handleReassign = async () => {
    if (!reassignTarget || selectedSpecs.size === 0 || !expandedUser) return;
    setReassigning(true);
    try {
      await trpc.admin.specs.reassignOwner.mutate({
        specIds: Array.from(selectedSpecs),
        newOwnerId: reassignTarget,
      });
      // Remove reassigned specs from the expanded user's list
      setUserSpecs((prev) => ({
        ...prev,
        [expandedUser]: (prev[expandedUser] || []).filter(
          (s) => !selectedSpecs.has(s.id)
        ),
        // Invalidate target user's cache so it reloads
        [reassignTarget]: undefined as unknown as Spec[],
      }));
      setSelectedSpecs(new Set());
      setReassignTarget("");
    } finally {
      setReassigning(false);
    }
  };

  if (loading) {
    return <div className="text-neutral-400 text-center py-12">{tCommon("loading")}</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8 tracking-tight">
        {tAdmin("title")}
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
                {tAdmin("email")}
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {tAdmin("name")}
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {tAdmin("role")}
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {tAdmin("created")}
              </th>
              <th className="text-right px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {tAdmin("actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <React.Fragment key={user.id}>
              <tr
                className={`border-b border-concrete-800 hover:bg-concrete-700/30 transition-colors ${
                  i % 2 === 1 ? "bg-concrete-800/40" : ""
                }`}
              >
                <td className="px-4 py-4 text-white font-bold">{user.email}</td>
                <td className="px-4 py-4 text-neutral-300">{user.name}</td>
                <td className="px-4 py-4">
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wide ${
                      user.isAdmin
                        ? "bg-safety-500/20 text-safety-400 border border-safety-500/30"
                        : "bg-concrete-700 text-neutral-400"
                    }`}
                  >
                    {user.isAdmin ? tAdmin("admin") : tAdmin("user")}
                  </span>
                </td>
                <td className="px-4 py-4 text-neutral-400 text-sm">
                  {new Date(user.createdAt).toLocaleDateString(
                    lang === "sv" ? "sv-SE" : "en-US"
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex gap-2 justify-end flex-wrap">
                    <button
                      onClick={() => handleToggleSpecs(user.id)}
                      className={`text-xs px-4 py-2 rounded font-bold uppercase tracking-wide transition-colors ${
                        expandedUser === user.id
                          ? "bg-safety-500/20 text-safety-400 border border-safety-500/30"
                          : "bg-concrete-800 hover:bg-concrete-700 text-neutral-200"
                      }`}
                    >
                      {expandedUser === user.id ? tAdmin("hideSpecs") : tAdmin("specs")}
                    </button>
                    <button
                      onClick={() =>
                        handleSetAdmin(user.id, !user.isAdmin)
                      }
                      className={`text-xs px-4 py-2 rounded font-bold uppercase tracking-wide transition-colors ${
                        user.isAdmin
                          ? "bg-red-900/50 hover:bg-red-700/50 text-red-300 hover:text-red-200"
                          : "bg-concrete-800 hover:bg-concrete-700 text-neutral-200"
                      }`}
                    >
                      {user.isAdmin ? tAdmin("demote") : tAdmin("promote")}
                    </button>
                    <button
                      onClick={() => handleGenerateResetLink(user.id)}
                      className="text-xs px-4 py-2 bg-concrete-800 hover:bg-concrete-700 text-neutral-200 rounded font-bold uppercase tracking-wide transition-colors"
                    >
                      {tAdmin("resetLink")}
                    </button>
                  </div>
                  {resetLinks[user.id] && (
                    <div className="mt-3 text-left bg-concrete-800/50 rounded p-3">
                      <p className="text-xs text-safety-400 font-bold mb-2 uppercase tracking-wide">
                        {tAdmin("linkGenerated")}
                      </p>
                      <input
                        type="text"
                        readOnly
                        value={resetLinks[user.id]}
                        className="w-full text-xs px-3 py-2 bg-concrete-950 border border-concrete-600 rounded text-white font-mono focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500"
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                  )}
                </td>
              </tr>
              {expandedUser === user.id && (
                <tr key={`${user.id}-specs`}>
                  <td colSpan={5} className="px-4 py-4 bg-concrete-950/50">
                    <div className="bg-concrete-800/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wide">
                          {tAdmin("specs")} — {user.name}
                        </h3>
                        {(userSpecs[user.id]?.length || 0) > 0 && (
                          <button
                            onClick={() => handleSelectAll(user.id)}
                            className="text-xs text-safety-500 hover:text-safety-400 font-bold uppercase tracking-wide transition-colors"
                          >
                            {selectedSpecs.size === (userSpecs[user.id]?.length || 0)
                              ? tAdmin("deselectAll")
                              : tAdmin("selectAll")}
                          </button>
                        )}
                      </div>
                      {!userSpecs[user.id] ? (
                        <p className="text-neutral-500 text-sm">{tCommon("loading")}</p>
                      ) : userSpecs[user.id].length === 0 ? (
                        <p className="text-neutral-500 text-sm">{tAdmin("noSpecs")}</p>
                      ) : (
                        <>
                          <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
                            {userSpecs[user.id].map((spec) => (
                              <label
                                key={spec.id}
                                className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors ${
                                  selectedSpecs.has(spec.id)
                                    ? "bg-safety-500/10 border border-safety-500/20"
                                    : "hover:bg-concrete-700/30"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedSpecs.has(spec.id)}
                                  onChange={() => handleToggleSpec(spec.id)}
                                  className="w-4 h-4 accent-amber-500"
                                />
                                <span className="text-sm text-neutral-200">{spec.name}</span>
                              </label>
                            ))}
                          </div>
                          {selectedSpecs.size > 0 && (
                            <div className="flex items-center gap-3 pt-3 border-t border-concrete-700">
                              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">
                                {tAdmin("reassignTo")}
                              </span>
                              <select
                                value={reassignTarget}
                                onChange={(e) => setReassignTarget(e.target.value)}
                                className="pl-3 pr-8 py-2 bg-concrete-800 border border-concrete-600 rounded text-white text-sm focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors appearance-none cursor-pointer"
                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23a3a3a3' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center" }}
                              >
                                <option value="">—</option>
                                {users
                                  .filter((u) => u.id !== user.id)
                                  .map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.name} ({u.email})
                                    </option>
                                  ))}
                              </select>
                              <button
                                onClick={handleReassign}
                                disabled={!reassignTarget || reassigning}
                                className="min-h-btn px-6 py-2 bg-safety-500 hover:bg-safety-400 text-concrete-950 font-bold text-xs uppercase tracking-wide rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {reassigning ? "..." : `${tAdmin("reassign")} (${selectedSpecs.size})`}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment> ))}
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
