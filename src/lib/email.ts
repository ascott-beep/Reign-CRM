import "server-only";
import { Resend } from "resend";

const FROM = "Reign CRM <noreply@reign.partners>";

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
export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const resend = client();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — would have sent "${input.subject}" to ${input.to}`);
    return { sent: false as const };
  }
  await resend.emails.send({ from: FROM, to: input.to, subject: input.subject, html: input.html });
  return { sent: true as const };
}

function linkButton(url: string, label: string) {
  return `<a href="${url}" style="display:inline-block;background:#0c2139;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-family:sans-serif;font-size:14px">${label}</a>`;
}

export async function sendInviteEmail(input: { to: string; firstName: string; url: string }) {
  return sendEmail({
    to: input.to,
    subject: "You've been invited to Reign CRM",
    html: `<div style="font-family:sans-serif;color:#0c2139;max-width:480px">
      <p>Hi ${input.firstName},</p>
      <p>You've been invited to join Reign CRM. Set a password to get started — this link lasts 7 days.</p>
      <p style="margin:24px 0">${linkButton(input.url, "Set your password")}</p>
      <p style="color:#5d6b7a;font-size:13px">If you weren't expecting this, you can ignore this email.</p>
    </div>`,
  });
}

export async function sendPasswordResetEmail(input: { to: string; firstName: string; url: string }) {
  return sendEmail({
    to: input.to,
    subject: "Reset your Reign CRM password",
    html: `<div style="font-family:sans-serif;color:#0c2139;max-width:480px">
      <p>Hi ${input.firstName},</p>
      <p>Use this link to set a new password — it lasts 1 hour.</p>
      <p style="margin:24px 0">${linkButton(input.url, "Reset your password")}</p>
      <p style="color:#5d6b7a;font-size:13px">If you didn't request this, you can ignore this email.</p>
    </div>`,
  });
}
