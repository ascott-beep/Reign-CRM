import "server-only";
import { baseUrl } from "@/lib/base-url";
import type { MailProvider } from "@prisma/client";

/**
 * Round 2 section 7 "reusing the same Microsoft and Google apps as sign-in" —
 * same client id/secret as src/auth.ts, just a separate, incremental-consent
 * OAuth flow (so we get a refresh token for background sync, which the
 * sign-in flow never needs). One Azure AD app, one Google app — see the
 * wrap-up notes for the exact setup steps.
 */
export function mailboxProviderConfigured(provider: MailProvider): boolean {
  if (provider === "MICROSOFT") {
    return Boolean(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID);
  }
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(provider: MailProvider) {
  return `${baseUrl()}/api/connections/${provider.toLowerCase()}/callback`;
}

const MICROSOFT_SCOPES = "offline_access User.Read Mail.Read Mail.Send Calendars.Read";
const GOOGLE_SCOPES =
  "openid email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.readonly";

export function buildAuthorizeUrl(provider: MailProvider, state: string): string {
  if (provider === "MICROSOFT") {
    const tenant = process.env.AZURE_AD_TENANT_ID;
    const params = new URLSearchParams({
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      response_type: "code",
      redirect_uri: redirectUri(provider),
      response_mode: "query",
      scope: MICROSOFT_SCOPES,
      state,
      prompt: "consent",
    });
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri(provider),
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export type ExchangedTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresInSeconds: number;
  email: string;
};

async function fetchMicrosoftEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Could not read the Microsoft account's email address (${res.status}).`);
  const profile = await res.json();
  const email = profile.mail ?? profile.userPrincipalName;
  if (!email) throw new Error("Microsoft Graph did not return an email address for this account.");
  return email;
}

async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Could not read the Google account's email address (${res.status}).`);
  const profile = await res.json();
  if (!profile.email) throw new Error("Google did not return an email address for this account.");
  return profile.email as string;
}

export async function exchangeCodeForTokens(provider: MailProvider, code: string): Promise<ExchangedTokens> {
  if (provider === "MICROSOFT") {
    const tenant = process.env.AZURE_AD_TENANT_ID;
    const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri(provider),
        scope: MICROSOFT_SCOPES,
      }),
    });
    if (!res.ok) throw new Error(`Microsoft token exchange failed (${res.status}): ${await res.text()}`);
    const json = await res.json();
    const email = await fetchMicrosoftEmail(json.access_token);
    return { accessToken: json.access_token, refreshToken: json.refresh_token ?? null, expiresInSeconds: json.expires_in, email };
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(provider),
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  const email = await fetchGoogleEmail(json.access_token);
  return { accessToken: json.access_token, refreshToken: json.refresh_token ?? null, expiresInSeconds: json.expires_in, email };
}

export type RefreshedTokens = { accessToken: string; refreshToken: string | null; expiresInSeconds: number };

/** Microsoft rotates refresh tokens on every use (store the new one); Google normally keeps the same one (refreshToken comes back null — keep the existing one). */
export async function refreshAccessToken(provider: MailProvider, refreshToken: string): Promise<RefreshedTokens> {
  if (provider === "MICROSOFT") {
    const tenant = process.env.AZURE_AD_TENANT_ID;
    const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: MICROSOFT_SCOPES,
      }),
    });
    if (!res.ok) throw new Error(`Microsoft token refresh failed (${res.status}): ${await res.text()}`);
    const json = await res.json();
    return { accessToken: json.access_token, refreshToken: json.refresh_token ?? null, expiresInSeconds: json.expires_in };
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  return { accessToken: json.access_token, refreshToken: json.refresh_token ?? null, expiresInSeconds: json.expires_in };
}
