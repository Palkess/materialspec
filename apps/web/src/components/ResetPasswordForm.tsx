import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { I18nextProvider, useTranslation } from "react-i18next";
import { trpc } from "../lib/trpc";
import { createI18n } from "../lib/i18n";

interface Props {
  lang: "sv" | "en";
  token: string;
}

const schema = z
  .object({
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordFormInner({ lang, token }: Props) {
  const { t } = useTranslation("auth");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setError("");
    setLoading(true);
    try {
      await trpc.auth.consumeResetToken.mutate({
        token,
        newPassword: data.newPassword,
      });
      setSuccess(true);
    } catch {
      setError(t("resetPassword.error"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto bg-concrete-900 border border-concrete-800 rounded-lg p-8 text-center">
        <div className="bg-green-900/50 border-l-4 border-green-500 text-green-200 px-4 py-3 rounded mb-6 font-bold text-sm">
          {t("resetPassword.success")}
        </div>
        <a
          href={`/${lang}/login`}
          className="min-h-btn inline-flex items-center bg-safety-500 hover:bg-safety-400 text-concrete-950 font-bold py-2 px-6 rounded transition-colors uppercase tracking-wide text-sm"
        >
          {t("resetPassword.login")}
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-concrete-900 border border-concrete-800 rounded-lg p-8">
      <h1 className="text-3xl font-bold text-white mb-8 tracking-tight">
        {t("resetPassword.title")}
      </h1>

      {error && (
        <div className="bg-red-900/50 border-l-4 border-red-500 text-red-200 px-4 py-3 rounded mb-6 font-bold text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block font-bold text-neutral-200 mb-2 uppercase text-sm tracking-wide">
            {t("resetPassword.newPassword")}
          </label>
          <input
            type="password"
            autoComplete="new-password"
            {...register("newPassword")}
            className="w-full px-4 py-3 bg-concrete-800 border border-concrete-600 rounded text-white focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors"
          />
          <p className="text-neutral-500 text-xs mt-1">{t("resetPassword.hint")}</p>
          {errors.newPassword && (
            <p className="text-red-400 text-sm mt-1 font-bold">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div>
          <label className="block font-bold text-neutral-200 mb-2 uppercase text-sm tracking-wide">
            {t("resetPassword.confirmPassword")}
          </label>
          <input
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
            className="w-full px-4 py-3 bg-concrete-800 border border-concrete-600 rounded text-white focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors"
          />
          {errors.confirmPassword && (
            <p className="text-red-400 text-sm mt-1 font-bold">
              {t("resetPassword.mismatch")}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-btn bg-safety-500 hover:bg-safety-400 text-concrete-950 font-bold text-lg py-3 px-6 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
        >
          {loading ? "..." : t("resetPassword.submit")}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordForm({ lang, token }: Props) {
  const i18n = createI18n(lang);
  return (
    <I18nextProvider i18n={i18n}>
      <ResetPasswordFormInner lang={lang} token={token} />
    </I18nextProvider>
  );
}
