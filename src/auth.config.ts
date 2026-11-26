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
      const { pathname } = request.nextUrl;
      const isOnLogin = pathname.startsWith("/login");
      // /set-password: an invited/reset-password user has no session yet — the page
      // and its action re-validate the token themselves, so this just lets them in.
      const isOnSetPassword = pathname.startsWith("/set-password");
      // /api/cron/*: authenticated by CRON_SECRET inside each route, not by session.
      const isOnPublicApi = pathname.startsWith("/api/auth") || pathname.startsWith("/api/cron");

      if (isOnPublicApi || isOnSetPassword) return true;
      if (isOnLogin) return isLoggedIn ? Response.redirect(new URL("/dashboard", request.nextUrl)) : true;
      return isLoggedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
