import "server-only";
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/mailbox-crypto";
import { refreshAccessToken } from "@/lib/mailbox-oauth";
import type { MailboxConnection } from "@prisma/client";

const EXPIRY_SAFETY_MARGIN_MS = 60_000;

/** Decrypts the connection's access token, transparently refreshing it first if it's expired or about to be. */
export async function getValidAccessToken(connection: MailboxConnection): Promise<string> {
  const expired = !connection.tokenExpiresAt || connection.tokenExpiresAt.getTime() - EXPIRY_SAFETY_MARGIN_MS < Date.now();
  if (!expired) return decryptToken(connection.accessTokenEncrypted);

  if (!connection.refreshTokenEncrypted) {
    await prisma.mailboxConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR", lastErrorMessage: "Access token expired and there is no refresh token, reconnect in Settings → Connections." },
    });
    throw new Error("Mailbox connection needs to be reconnected.");
  }

  const refreshed = await refreshAccessToken(connection.provider, decryptToken(connection.refreshTokenEncrypted));
  await prisma.mailboxConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEncrypted: encryptToken(refreshed.accessToken),
      refreshTokenEncrypted: refreshed.refreshToken ? encryptToken(refreshed.refreshToken) : connection.refreshTokenEncrypted,
      tokenExpiresAt: new Date(Date.now() + refreshed.expiresInSeconds * 1000),
      status: "ACTIVE",
      lastErrorMessage: null,
    },
  });
  return refreshed.accessToken;
}
