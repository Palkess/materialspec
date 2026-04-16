import type { Context as HonoContext } from "hono";
import type { Session, User } from "lucia";
import { lucia } from "../auth/lucia.js";

export interface TRPCContext {
  session: Session | null;
  user: User | null;
  setCookie: (name: string, value: string, attributes: Record<string, unknown>) => void;
  deleteCookie: (name: string) => void;
}

export async function createContext(c: HonoContext): Promise<TRPCContext> {
  const cookieHeader = c.req.header("Cookie") ?? "";
  const sessionId = lucia.readSessionCookie(cookieHeader);

  let session: Session | null = null;
  let user: User | null = null;

  if (sessionId) {
    const result = await lucia.validateSession(sessionId);
    session = result.session;
    user = result.user;

    if (session && session.fresh) {
      const cookie = lucia.createSessionCookie(session.id);
      c.header("Set-Cookie", cookie.serialize(), { append: true });
    }
    if (!session) {
      const cookie = lucia.createBlankSessionCookie();
      c.header("Set-Cookie", cookie.serialize(), { append: true });
    }
  }

  return {
    session,
    user,
    setCookie: (name, value, attributes) => {
      const parts = [`${name}=${value}`];
      if (attributes.path) parts.push(`Path=${attributes.path}`);
      if (attributes.httpOnly) parts.push("HttpOnly");
      if (attributes.secure) parts.push("Secure");
      if (attributes.sameSite) parts.push(`SameSite=${attributes.sameSite}`);
      if (attributes.maxAge) parts.push(`Max-Age=${attributes.maxAge}`);
      c.header("Set-Cookie", parts.join("; "), { append: true });
    },
    deleteCookie: (name) => {
      c.header("Set-Cookie", `${name}=; Path=/; Max-Age=0`, { append: true });
    },
  };
}
