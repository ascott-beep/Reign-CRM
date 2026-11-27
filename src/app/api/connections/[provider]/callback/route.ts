import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/permissions";
import { exchangeCodeForTokens } from "@/lib/mailbox-oauth";
import { encryptToken } from "@/lib/mailbox-crypto";
import { ensureChangeNotifications } from "@/lib/mailbox-sync";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import type { MailProvider } from "@prisma/client";

function parseProvider(raw: string): MailProvider | null {
  if (raw === "microsoft") return "MICROSOFT";
  if (raw === "google") return "GOOGLE";
  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const user = await requireUser();
  const provider = parseProvider((await params).provider);
  const redirectTo = (status: "connected" | "error", message?: string) => {
    const url = new URL("/settings/connections", req.nextUrl.origin);
    url.searchParams.set(status, provider ?? "");
    if (message) url.searchParams.set("message", message);
    return NextResponse.redirect(url);
  };
  if (!provider) return redirectTo("error", "Unknown provider.");

  const { searchParams } = req.nextUrl;
  if (searchParams.get("error")) return redirectTo("error", searchParams.get("error_description") ?? searchParams.get("error")!);

  const expectedState = req.cookies.get(`mailbox_oauth_state_${provider}`)?.value;
  const state = searchParams.get("state");
  const code = searchParams.get("code");
  if (!code || !state || !expectedState || state !== expectedState) return redirectTo("error", "The sign-in link expired — try connecting again.");

  try {
    const tokens = await exchangeCodeForTokens(provider, code);
    const connection = await prisma.mailboxConnection.upsert({
      where: { userId_provider: { userId: user.id, provider } },
      create: {
        userId: user.id,
        provider,
        emailAddress: tokens.email,
        accessTokenEncrypted: encryptToken(tokens.accessToken),
        refreshTokenEncrypted: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresInSeconds * 1000),
        status: "ACTIVE",
      },
      update: {
        emailAddress: tokens.email,
        accessTokenEncrypted: encryptToken(tokens.accessToken),
        // Google's consent screen doesn't always return a refresh token on
        // reconnect — keep the existing one rather than overwrite with null.
        refreshTokenEncrypted: tokens.refreshToken ? encryptToken(tokens.refreshToken) : undefined,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresInSeconds * 1000),
        status: "ACTIVE",
        lastErrorMessage: null,
      },
    });

    await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "MailboxConnection", entityId: user.id, action: "CREATE", changedFields: { provider, emailAddress: tokens.email } });
    await ensureChangeNotifications(connection).catch(() => undefined);

    const res = redirectTo("connected");
    res.cookies.delete(`mailbox_oauth_state_${provider}`);
    return res;
  } catch (e) {
    return redirectTo("error", e instanceof Error ? e.message : "Connection failed.");
  }
}
