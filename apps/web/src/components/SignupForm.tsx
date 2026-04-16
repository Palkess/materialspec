import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "../lib/trpc";

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(128),
});

type SignupInput = z.infer<typeof signupSchema>;

interface Props {
  lang: "sv" | "en";
}

const t = {
  sv: {
    title: "Skapa konto",
    email: "E-post",
    name: "Namn",
    password: "Lösenord",
    passwordHint: "Minst 8 tecken",
    submit: "Skapa konto",
    hasAccount: "Har du redan ett konto?",
    login: "Logga in",
    errorEmailTaken: "E-postadressen är redan registrerad",
    errorGeneric: "Något gick fel, försök igen",
  },
  en: {
    title: "Sign up",
    email: "Email",
    name: "Name",
    password: "Password",
    passwordHint: "At least 8 characters",
    submit: "Sign up",
    hasAccount: "Already have an account?",
    login: "Log in",
    errorEmailTaken: "Email address is already registered",
    errorGeneric: "Something went wrong, please try again",
  },
};

export default function SignupForm({ lang }: Props) {
  const labels = t[lang];
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (data: SignupInput) => {
    setError("");
    setLoading(true);
    try {
      await trpc.auth.signup.mutate(data);
      window.location.href = `/${lang}/specs`;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "";
      if (message.includes("emailTaken")) {
        setError(labels.errorEmailTaken);
      } else {
        setError(labels.errorGeneric);
      }
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
            htmlFor="name"
            className="block text-sm font-bold text-gray-300 mb-2"
          >
            {labels.name}
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            {...register("name")}
            className="w-full px-4 py-3 bg-concrete-900 border border-concrete-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500"
          />
          {errors.name && (
            <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

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
            autoComplete="new-password"
            {...register("password")}
            className="w-full px-4 py-3 bg-concrete-900 border border-concrete-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-safety-500 focus:ring-1 focus:ring-safety-500"
          />
          <p className="text-gray-500 text-xs mt-1">{labels.passwordHint}</p>
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
        {labels.hasAccount}{" "}
        <a
          href={`/${lang}/login`}
          className="text-safety-500 hover:text-safety-400 font-bold"
        >
          {labels.login}
        </a>
      </p>
    </div>
  );
}
