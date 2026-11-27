import "server-only";
import { Resend } from "resend";

const FROM = "Atlas <noreply@reign.partners>";

function client() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Section 9.5: "Email: use Resend... I'll add the DNS records." Until that
 * env var is set (it's one of Adam's setup tasks, section 10.4), sending is
 * a no-op logged to the console rather than a hard failure — the invite/
 * reset link itself is still generated and stored, so the flow can be
 * exercised by reading it from the server log or database in the meantime.
 */
export async function sendEmail(input: { to: string; subject: string; html: string; replyTo?: string }) {
  const resend = client();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set, would have sent "${input.subject}" to ${input.to}`);
    return { sent: false as const };
  }
  await resend.emails.send({ from: FROM, to: input.to, subject: input.subject, html: input.html, replyTo: input.replyTo });
  return { sent: true as const };
}

function linkButton(url: string, label: string) {
  return `<a href="${url}" style="display:inline-block;background:#0c2139;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-family:sans-serif;font-size:14px;font-weight:600">${label}</a>`;
}

const LOGO = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#0c2139" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h7v7H4V4zm9 0h7v3h-4v4h-3V4zM4 13h3v4h4v3H4v-7zm9 5v-3h3v-4h4v7h-7z"/></svg>
  <span style="font-size:20px;font-weight:600;color:#0c2139">Atlas</span>
</div>`;

/**
 * Round 4 screens 48/49: one shared card template. Explicit colour on every
 * element (background, text, border) rather than relying on client
 * defaults, since an Outlook dark-mode re-paint can otherwise invert an
 * element that has no colour of its own set and make it unreadable.
 */
function emailShell(body: string) {
  return `<div style="background-color:#eef1f5;padding:32px 16px;font-family:sans-serif">
    <div style="max-width:480px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:32px">
      ${LOGO}
      ${body}
    </div>
    <p style="max-width:480px;margin:16px auto 0;padding:16px 0 0;border-top:1px solid #d7dee6;color:#8796a8;font-size:12px">Reign Partners &middot; London</p>
  </div>`;
}

export async function sendInviteEmail(input: { to: string; firstName: string; url: string; inviterName: string; workspaceName: string; roleLabel: string; replyTo?: string }) {
  return sendEmail({
    to: input.to,
    subject: `${input.inviterName.split(" ")[0]} invited you to Atlas`,
    replyTo: input.replyTo,
    html: emailShell(`
      <p style="color:#0c2139;font-size:14px;margin:0 0 16px">Hi ${input.firstName},</p>
      <p style="color:#0c2139;font-size:14px;margin:0 0 24px">${input.inviterName} has invited you to Atlas, the ${input.workspaceName} CRM, as a ${input.roleLabel}.</p>
      <p style="margin:0 0 24px">${linkButton(input.url, "Join Atlas")}</p>
      <p style="color:#5d6b7a;font-size:13px;margin:0">This invite works for 7 days. If you weren't expecting it, you can ignore this email.</p>
    `),
  });
}

export async function sendPasswordResetEmail(input: { to: string; firstName: string; url: string }) {
  return sendEmail({
    to: input.to,
    subject: "Reset your Atlas password",
    html: emailShell(`
      <p style="color:#0c2139;font-size:14px;margin:0 0 16px">Hi ${input.firstName},</p>
      <p style="color:#0c2139;font-size:14px;margin:0 0 24px">Someone asked to reset the password for ${input.to}. If it was you, choose a new one below.</p>
      <p style="margin:0 0 24px">${linkButton(input.url, "Choose a new password")}</p>
      <p style="color:#5d6b7a;font-size:13px;margin:0">The link works for 1 hour. If you didn't ask for this, ignore this email. Your password won't change.</p>
    `),
  });
}

export async function sendNewInviteRequestEmail(input: { to: string; adminFirstName: string; requesterName: string; url: string }) {
  return sendEmail({
    to: input.to,
    subject: `${input.requesterName}'s invite to Atlas expired`,
    html: emailShell(`
      <p style="color:#0c2139;font-size:14px;margin:0 0 16px">Hi ${input.adminFirstName},</p>
      <p style="color:#0c2139;font-size:14px;margin:0 0 24px">${input.requesterName} tried to accept their invite to Atlas, but the link had already expired. Send them a new one from the Users page in Settings.</p>
      <p style="margin:0 0 24px">${linkButton(input.url, "Resend the invite")}</p>
    `),
  });
}
