import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config — no Node.js-only dependencies (no mongoose, no bcrypt).
 * Used by middleware.ts which runs in the Edge Runtime.
 */
export const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
};
