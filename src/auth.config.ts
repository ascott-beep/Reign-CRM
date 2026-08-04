import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe config (no Prisma / bcrypt here) used by middleware for route
 * gating. The Credentials provider itself — which does touch the database —
 * lives in `src/auth.ts` and is only loaded in the Node.js runtime.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // 12 hours
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = request.nextUrl.pathname.startsWith("/login");
      const isOnPublicApi = request.nextUrl.pathname.startsWith("/api/auth");

      if (isOnPublicApi) return true;
      if (isOnLogin) return isLoggedIn ? Response.redirect(new URL("/dashboard", request.nextUrl)) : true;
      return isLoggedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
