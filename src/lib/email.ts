import { appUrl } from "./utils";

export type SendResult = { status: "sent" | "failed" | "skipped"; error?: string };

export const emailConfigured = () => !!process.env.RESEND_API_KEY;

// Sends through Resend's HTTP API. Never throws; callers log the outcome.
export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { status: "skipped", error: "Email is not configured (RESEND_API_KEY missing)." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || "EventPulse <onboarding@resend.dev>", to: [to], subject, html }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { status: "sent" };
    const j = await res.json().catch(() => ({}));
    return { status: "failed", error: String(j.message ?? `Provider error ${res.status}`).slice(0, 300) };
  } catch {
    return { status: "failed", error: "Could not reach the email provider." };
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Replaces {{name}}-style variables. Unknown variables become empty.
export function render(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

export function emailHtml(opts: { body: string; ctaLabel?: string; ctaUrl?: string; qrUrl?: string; footer?: string }) {
  const body = esc(opts.body).replace(/\n/g, "<br>");
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0">
<tr><td style="padding:20px 28px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#4f46e5;font-size:18px">EventPulse</td></tr>
<tr><td style="padding:28px;color:#0f172a;font-size:15px;line-height:1.6">${body}
${opts.qrUrl ? `<div style="text-align:center;margin:24px 0"><img src="${esc(opts.qrUrl)}" width="180" height="180" alt="Ticket QR code"></div>` : ""}
${opts.ctaUrl ? `<div style="text-align:center;margin:24px 0 4px"><a href="${esc(opts.ctaUrl)}" style="background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">${esc(opts.ctaLabel ?? "Open")}</a></div>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0">${esc(opts.footer ?? "Sent via EventPulse")}</td></tr>
</table></td></tr></table></body></html>`;
}

export const qrImageUrl = (token: string) => `${appUrl()}/api/qr/${token}`;
