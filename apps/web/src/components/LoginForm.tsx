import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "../lib/trpc";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginInput = z.infer<typeof loginSchema>;

interface Props {
  lang: "sv" | "en";
}

const t = {
  sv: {
    title: "Logga in",
    email: "E-post",
    password: "Lösenord",
    submit: "Logga in",
    noAccount: "Har du inget konto?",
    signup: "Skapa konto",
    error: "Felaktig e-post eller lösenord",
  },
  en: {
    title: "Log in",
    email: "Email",
    password: "Password",
    submit: "Log in",
    noAccount: "Don't have an account?",
    signup: "Sign up",
    error: "Invalid email or password",
  },
};

export default function LoginForm({ lang }: Props) {
  const labels = t[lang];
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setError(labels.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">{labels.title}</h1>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-bold text-gray-300 mb-2"
          >
            {labels.email}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="w-full px-4 py-3 bg-concrete-900 border border-concrete-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500"
          />
          {errors.email && (
            <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-bold text-gray-300 mb-2"
          >
            {labels.password}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
            className="w-full px-4 py-3 bg-concrete-900 border border-concrete-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500"
          />
          {errors.password && (
            <p className="text-red-400 text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-btn bg-safety-500 hover:bg-safety-400 text-concrete-950 font-bold py-3 px-6 rounded transition-colors disabled:opacity-50"
        >
          {loading ? "..." : labels.submit}
        </button>
      </form>

      <p className="text-gray-400 text-center mt-6">
        {labels.noAccount}{" "}
        <a
          href={`/${lang}/signup`}
          className="text-safety-500 hover:text-safety-400 font-bold"
        >
          {labels.signup}
        </a>
      </p>
    </div>
  );
}
