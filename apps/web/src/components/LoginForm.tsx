import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { I18nextProvider, useTranslation } from "react-i18next";
import { trpc } from "../lib/trpc";
import { createI18n } from "../lib/i18n";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginInput = z.infer<typeof loginSchema>;

interface Props {
  lang: "sv" | "en";
}

function LoginFormInner({ lang }: Props) {
  const { t } = useTranslation("auth");
  const { t: tErrors } = useTranslation("errors");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trpc.auth.me.query().then(() => {
      window.location.href = `/${lang}/specs`;
    }).catch(() => {/* not authenticated, stay on login */});
  }, [lang]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setError("");
    setLoading(true);
    try {
      await trpc.auth.login.mutate(data);
      window.location.href = `/${lang}/specs`;
    } catch {
      setError(tErrors("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-concrete-900 border border-concrete-800 rounded-lg p-8">
      <h1 className="text-3xl font-bold text-white mb-8 tracking-tight">
        {t("login.title")}
      </h1>

      {error && (
        <div className="bg-red-900/50 border-l-4 border-red-500 text-red-200 px-4 py-3 rounded mb-6 font-bold text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label
            htmlFor="email"
            className="block font-bold text-neutral-200 mb-2 uppercase text-sm tracking-wide"
          >
            {t("login.email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="w-full px-4 py-3 bg-concrete-800 border border-concrete-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors"
          />
          {errors.email && (
            <p className="text-red-400 text-sm mt-1 font-bold">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block font-bold text-neutral-200 mb-2 uppercase text-sm tracking-wide"
          >
            {t("login.password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
            className="w-full px-4 py-3 bg-concrete-800 border border-concrete-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500 transition-colors"
          />
          {errors.password && (
            <p className="text-red-400 text-sm mt-1 font-bold">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-btn bg-safety-500 hover:bg-safety-400 text-concrete-950 font-bold text-lg py-3 px-6 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
        >
          {loading ? "..." : t("login.submit")}
        </button>
      </form>

      <p className="text-neutral-400 text-center mt-6">
        {t("login.noAccount")}{" "}
        <a
          href={`/${lang}/signup`}
          className="text-safety-500 hover:text-safety-400 font-bold underline underline-offset-2"
        >
          {t("login.signup")}
        </a>
      </p>
    </div>
  );
}

export default function LoginForm({ lang }: Props) {
  const i18n = createI18n(lang);
  return (
    <I18nextProvider i18n={i18n}>
      <LoginFormInner lang={lang} />
    </I18nextProvider>
  );
}
