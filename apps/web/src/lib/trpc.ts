import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@materialspec/api/src/trpc/router.js";

const apiUrl =
  typeof window !== "undefined"
    ? (window as unknown as { __API_URL__?: string }).__API_URL__ ||
      "http://localhost:3002"
    : import.meta.env.PUBLIC_API_URL || "http://localhost:3002";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${apiUrl}/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ],
});
