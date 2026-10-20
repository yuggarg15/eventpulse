export const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL || process.env.URL || "http://localhost:3000").replace(/\/$/, "");

export const trackingUrl = (code: string) => `${appUrl()}/go/${code}`;

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";

// <input type="datetime-local"> value -> ISO, interpreted as IST (the app's fixed time zone)
export const istToIso = (v: string) => new Date(v + ":00+05:30").toISOString();
export const isoToIstInput = (iso: string) =>
  new Date(new Date(iso).getTime() + 5.5 * 3600e3).toISOString().slice(0, 16);

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

// Percentage with safe handling of zero denominators. Returns null when undefined.
export const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);
export const fmtPct = (v: number | null) => (v === null ? "—" : `${v}%`);

export function randomToken(bytes = 18) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomCode(len = 8) {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const a = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(a, (b) => chars[b % chars.length]).join("");
}

// Build the event URL with UTM params; empty values are omitted, values are URL-encoded.
export function buildUtmUrl(base: string, utm: Record<string, string | null | undefined>) {
  const u = new URL(base);
  for (const [k, v] of Object.entries(utm)) {
    const val = v?.trim();
    if (val) u.searchParams.set(k, val);
  }
  return u.toString();
}

export const normalizeUtm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "_");

export const CHANNELS: Record<string, { source: string; medium: string }> = {
  WhatsApp: { source: "whatsapp", medium: "messaging" },
  Instagram: { source: "instagram", medium: "social" },
  Email: { source: "email", medium: "email" },
  SMS: { source: "sms", medium: "messaging" },
  "QR / Poster": { source: "poster", medium: "offline" },
  Website: { source: "website", medium: "referral" },
  Other: { source: "other", medium: "other" },
};
