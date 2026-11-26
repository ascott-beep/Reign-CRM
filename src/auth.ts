import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const oauthProviders = [];
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  oauthProviders.push(Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }));
}
if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID) {
  oauthProviders.push(
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findFirst({
          where: { email, active: true },
        });
        if (!user || !user.passwordHash) return null;

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          workspaceId: user.workspaceId,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
    ...oauthProviders,
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // Credentials already resolved against the DB in authorize(). OAuth sign-ins
      // (Google / Microsoft) only ever match an existing, active user by email —
      // section 9.2: "unknown email shows 'This account isn't set up...'".
      if (account?.provider !== "google" && account?.provider !== "microsoft-entra-id") return true;
      if (!user.email) return "/login?error=NotSetUp";

      const existing = await prisma.user.findFirst({ where: { email: user.email.toLowerCase(), active: true } });
      if (!existing) return "/login?error=NotSetUp";

      await prisma.user.update({ where: { id: existing.id }, data: { lastLoginAt: new Date() } });
      user.id = existing.id;
      user.role = existing.role;
      user.workspaceId = existing.workspaceId;
      user.firstName = existing.firstName;
      user.lastName = existing.lastName;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as string;
        token.workspaceId = user.workspaceId as string;
        token.firstName = user.firstName as string;
        token.lastName = user.lastName as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "STANDARD" | "READ_ONLY";
        session.user.workspaceId = token.workspaceId as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
      }
      return session;
    },
  },
});
