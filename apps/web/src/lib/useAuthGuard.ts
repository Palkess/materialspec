import { useState, useEffect } from "react";
import { trpc } from "./trpc";

interface AuthUser {
  name: string;
  email: string;
  locale: string;
  isAdmin: boolean;
}

interface AuthGuardResult {
  user: AuthUser | null;
  checking: boolean;
}

/**
 * Client-side auth guard. Checks if the user is authenticated via trpc.auth.me
 * and redirects to the login page if not.
 */
export function useAuthGuard(lang: "sv" | "en"): AuthGuardResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    trpc.auth.me
      .query()
      .then((data) => {
        setUser(data);
        setChecking(false);
      })
      .catch(() => {
        window.location.href = `/${lang}/login`;
      });
  }, [lang]);

  return { user, checking };
}
