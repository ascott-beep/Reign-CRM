import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireUser } from "@/lib/permissions";
import { buildAuthorizeUrl, mailboxProviderConfigured } from "@/lib/mailbox-oauth";
import type { MailProvider } from "@prisma/client";

function parseProvider(raw: string): MailProvider | null {
  if (raw === "microsoft") return "MICROSOFT";
  if (raw === "google") return "GOOGLE";
  return null;
}

/** Round 2 section 7 — "Each user connects their own mailbox" starts here, from their own Settings → Connections page. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  await requireUser();
  const provider = parseProvider((await params).provider);
  if (!provider) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  if (!mailboxProviderConfigured(provider)) return NextResponse.json({ error: "Not configured yet." }, { status: 400 });

  const state = crypto.randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(buildAuthorizeUrl(provider, state));
  res.cookies.set(`mailbox_oauth_state_${provider}`, state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
