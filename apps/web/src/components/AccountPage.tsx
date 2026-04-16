import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { I18nextProvider, useTranslation } from "react-i18next";
import { trpc } from "../lib/trpc";
import { createI18n } from "../lib/i18n";

interface Props {
  lang: "sv" | "en";
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const t_pw = {
  sv: {
    title: "Byt lösenord",
    currentPassword: "Nuvarande lösenord",
    newPassword: "Nytt lösenord",
    confirmPassword: "Bekräfta nytt lösenord",
    submit: "Byt lösenord",
    success: "Lösenordet har ändrats",
    wrongPassword: "Nuvarande lösenord är felaktigt",
    mismatch: "Lösenorden matchar inte",
    hint: "Minst 8 tecken",
  },
  en: {
    title: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    submit: "Change password",
    success: "Password has been changed",
    wrongPassword: "Current password is incorrect",
    mismatch: "Passwords don't match",
    hint: "At least 8 characters",
  },
};

function AccountPageInner({ lang }: Props) {
  const { t } = useTranslation("common");
  const labels = t_pw[lang];
  const [user, setUser] = useState<{
    name: string;
    email: string;
    locale: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

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

  const onChangePassword = async (data: ChangePasswordInput) => {
    setPwError("");
    setPwSuccess(false);
    try {
      await trpc.auth.changePassword.mutate({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPwSuccess(true);
      reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("invalidCredentials")) {
        setPwError(labels.wrongPassword);
      } else {
        setPwError(labels.wrongPassword);
      }
    }
  };

  if (!user) {
    return <div className="text-neutral-400">{t("loading")}</div>;
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8 tracking-tight">
        {t("account")}
      </h1>

      <div className="space-y-6">
        {/* User info */}
        <div className="bg-concrete-900 border border-concrete-800 rounded-lg p-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-safety-500 flex items-center justify-center text-concrete-950 font-bold text-xl uppercase">
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-white text-lg">{user.name}</p>
              <p className="text-neutral-400 text-sm">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Language selector */}
        <div className="bg-concrete-900 border border-concrete-800 rounded-lg p-8">
          <label className="block font-bold text-neutral-200 mb-3 uppercase text-sm tracking-wide">
            {t("language")}
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => switchLocale("sv")}
              disabled={saving || user.locale === "sv"}
              className={`min-h-btn px-6 py-2 rounded font-bold text-sm uppercase tracking-wide transition-colors ${
                user.locale === "sv"
                  ? "bg-safety-500 text-concrete-950"
                  : "bg-concrete-800 text-neutral-200 hover:bg-concrete-700 border border-concrete-600"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Svenska
            </button>
            <button
              onClick={() => switchLocale("en")}
              disabled={saving || user.locale === "en"}
              className={`min-h-btn px-6 py-2 rounded font-bold text-sm uppercase tracking-wide transition-colors ${
                user.locale === "en"
                  ? "bg-safety-500 text-concrete-950"
                  : "bg-concrete-800 text-neutral-200 hover:bg-concrete-700 border border-concrete-600"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              English
            </button>
          </div>
        </div>

        {/* Change password */}
        <div className="bg-concrete-900 border border-concrete-800 rounded-lg p-8">
          <h2 className="font-bold text-neutral-200 mb-4 uppercase text-sm tracking-wide">
            {labels.title}
          </h2>

          {pwSuccess && (
            <div className="bg-green-900/50 border-l-4 border-green-500 text-green-200 px-4 py-3 rounded mb-4 font-bold text-sm">
              {labels.success}
            </div>
          )}

          {pwError && (
            <div className="bg-red-900/50 border-l-4 border-red-500 text-red-200 px-4 py-3 rounded mb-4 font-bold text-sm">
              {pwError}
            </div>
          )}

          <form
            onSubmit={handleSubmit(onChangePassword)}
            className="space-y-4"
          >
            <div>
              <label className="block font-bold text-neutral-300 mb-1 text-sm">
                {labels.currentPassword}
              </label>
              <input
                type="password"
                autoComplete="current-password"
                {...register("currentPassword")}
                className="w-full px-4 py-3 bg-concrete-800 border border-concrete-600 rounded text-white focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors"
              />
              {errors.currentPassword && (
                <p className="text-red-400 text-sm mt-1 font-bold">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block font-bold text-neutral-300 mb-1 text-sm">
                {labels.newPassword}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                {...register("newPassword")}
                className="w-full px-4 py-3 bg-concrete-800 border border-concrete-600 rounded text-white focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors"
              />
              <p className="text-neutral-500 text-xs mt-1">{labels.hint}</p>
              {errors.newPassword && (
                <p className="text-red-400 text-sm mt-1 font-bold">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block font-bold text-neutral-300 mb-1 text-sm">
                {labels.confirmPassword}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
                className="w-full px-4 py-3 bg-concrete-800 border border-concrete-600 rounded text-white focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors"
              />
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm mt-1 font-bold">
                  {labels.mismatch}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="min-h-btn bg-concrete-700 hover:bg-concrete-600 text-white font-bold py-2 px-6 rounded transition-colors uppercase tracking-wide text-sm"
            >
              {labels.submit}
            </button>
          </form>
        </div>

        {/* Logout */}
        <div className="bg-concrete-900 border border-concrete-800 rounded-lg p-8">
          <button
            onClick={handleLogout}
            className="min-h-btn bg-red-600 hover:bg-red-500 text-white font-bold text-sm uppercase tracking-wide py-2 px-6 rounded transition-colors"
          >
            {t("logout")}
          </button>
        </div>
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
