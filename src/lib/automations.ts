import { admin } from "./supabase";
import { AUTOMATION_KINDS, AUTOMATION_META, type AutomationKind } from "./automation-defaults";
import { emailHtml, qrImageUrl, render, sendEmail } from "./email";
import { appUrl, fmtDate } from "./utils";

type Ev = { id: string; owner_id: string; title: string; slug: string; starts_at: string; ends_at: string; venue: string | null; capacity: number | null; status: string; organizer_name: string | null };
type Reg = { id: string; name: string; email: string; ticket_token: string; status: string };
const MAX_ATTEMPTS = 3;
const PER_RUN = 60;

export async function ensureAutomations(eventId: string) {
  const db = admin();
  const { data } = await db.from("event_automations").select("*").eq("event_id", eventId);
  const have = new Set((data ?? []).map((a) => a.kind));
  const missing = AUTOMATION_KINDS.filter((k) => !have.has(k)).map((k) => ({
    event_id: eventId, kind: k, enabled: true, offset_hours: AUTOMATION_META[k].offset_hours, subject: AUTOMATION_META[k].subject, body: AUTOMATION_META[k].body,
  }));
  if (missing.length) await db.from("event_automations").insert(missing);
  const { data: all } = await db.from("event_automations").select("*").eq("event_id", eventId);
  return (all ?? []).sort((a, b) => AUTOMATION_KINDS.indexOf(a.kind) - AUTOMATION_KINDS.indexOf(b.kind));
}

export function variablesFor(ev: Ev, reg: Pick<Reg, "name" | "ticket_token"> | null, organizerName: string) {
  return {
    name: reg?.name ?? "", event: ev.title, date: fmtDate(ev.starts_at), venue: ev.venue ?? "", venue_line: ev.venue ? ` at ${ev.venue}` : "",
    organizer: organizerName, event_url: `${appUrl()}/e/${ev.slug}`,
    ticket_url: reg ? `${appUrl()}/ticket/${reg.ticket_token}` : "", feedback_url: reg ? `${appUrl()}/feedback/${reg.ticket_token}` : "",
    certificate_url: reg ? `${appUrl()}/certificate/${reg.ticket_token}` : "",
  };
}

const CTA: Record<AutomationKind, { label: string; url: (v: Record<string, string>) => string; qr?: boolean } | null> = {
  confirmation: { label: "View your ticket", url: (v) => v.ticket_url, qr: true },
  reminder: { label: "View your ticket", url: (v) => v.ticket_url, qr: true },
  waitlist_promoted: { label: "View your ticket", url: (v) => v.ticket_url, qr: true },
  feedback: { label: "Share feedback", url: (v) => v.feedback_url },
  certificate: { label: "Get your certificate", url: (v) => v.certificate_url },
  no_show: null,
  low_signups: { label: "Open EventPulse", url: () => `${appUrl()}/dashboard` },
};

// Sends one automated email and records the outcome. Safe to call repeatedly: a sent email is never re-sent.
export async function deliver(ev: Ev, kind: AutomationKind, reg: Reg | null, toEmail: string, organizerName: string) {
  const db = admin();
  if (reg) {
    const { data: prior } = await db.from("email_log").select("status").eq("registration_id", reg.id).eq("kind", kind);
    if (prior?.some((p) => p.status === "sent")) return "already_sent";
    if ((prior?.filter((p) => p.status !== "sent").length ?? 0) >= MAX_ATTEMPTS) return "gave_up";
  }
  const { data: auto } = await db.from("event_automations").select("*").eq("event_id", ev.id).eq("kind", kind).maybeSingle();
  const tpl = auto ?? { enabled: true, subject: AUTOMATION_META[kind].subject, body: AUTOMATION_META[kind].body };
  if (!tpl.enabled) return "disabled";
  const vars = variablesFor(ev, reg, organizerName);
  const subject = render(tpl.subject, vars), cta = CTA[kind];
  const html = emailHtml({ body: render(tpl.body, vars), ctaLabel: cta?.label, ctaUrl: cta?.url(vars) || undefined, qrUrl: cta?.qr && reg ? qrImageUrl(reg.ticket_token) : undefined, footer: `You received this because of ${ev.title}.` });
  const r = await sendEmail(toEmail, subject, html);
  await db.from("email_log").insert({ event_id: ev.id, registration_id: reg?.id ?? null, kind, to_email: toEmail, subject, status: r.status, error: r.error ?? null });
  return r.status;
}

async function organizerInfo(ownerId: string) {
  const { data } = await admin().auth.admin.getUserById(ownerId);
  const u = data.user;
  return { email: u?.email ?? "", name: (u?.user_metadata?.display_name as string) || u?.email?.split("@")[0] || "Organiser" };
}

// Processes every time-based automation. Called by the scheduled job and the "Run now" button.
export async function runAutomations(onlyEventId?: string) {
  const db = admin();
  let q = db.from("events").select("id,owner_id,title,slug,starts_at,ends_at,venue,capacity,status,organizer_name").in("status", ["published", "completed"]);
  if (onlyEventId) q = q.eq("id", onlyEventId);
  const { data: events } = await q;
  const now = Date.now();
  let sent = 0, failed = 0, budget = PER_RUN;
  const tally = (r: string) => { budget--; if (r === "sent") sent++; else if (r === "failed" || r === "skipped") failed++; };

  for (const ev of (events ?? []) as Ev[]) {
    if (budget <= 0) break;
    const autos = await ensureAutomations(ev.id);
    const on = (k: AutomationKind) => autos.find((a) => a.kind === k && a.enabled);
    const owner = await organizerInfo(ev.owner_id);
    const orgName = ev.organizer_name || owner.name;
    const { data: regs } = await db.from("event_registrations").select("id,name,email,ticket_token,status,created_at").eq("event_id", ev.id).eq("status", "confirmed");
    const { data: cis } = await db.from("event_check_ins").select("registration_id").eq("event_id", ev.id);
    const checked = new Set((cis ?? []).map((c) => c.registration_id));
    const all = (regs ?? []) as (Reg & { created_at: string })[];
    const start = new Date(ev.starts_at).getTime(), end = new Date(ev.ends_at).getTime();

    const each = async (kind: AutomationKind, list: Reg[]) => {
      for (const r of list) { if (budget <= 0) return; const res = await deliver(ev, kind, r, r.email, orgName); if (res === "sent" || res === "failed" || res === "skipped") tally(res); }
    };

    // Backstop for confirmations that failed at registration time (recent registrations only)
    if (on("confirmation")) await each("confirmation", all.filter((r) => now - new Date(r.created_at).getTime() < 3 * 86400e3));
    const rem = on("reminder");
    if (rem && now < start && start - now <= rem.offset_hours * 3600e3) await each("reminder", all);
    const after = (k: AutomationKind) => { const a = on(k); return a && now >= end + a.offset_hours * 3600e3 && now < end + 14 * 86400e3; };
    if (after("feedback")) await each("feedback", all.filter((r) => checked.has(r.id)));
    if (after("certificate")) await each("certificate", all.filter((r) => checked.has(r.id)));
    if (after("no_show")) await each("no_show", all.filter((r) => !checked.has(r.id)));

    if (on("low_signups") && ev.capacity && ev.status === "published" && now < start && start - now <= 7 * 86400e3 && all.length < ev.capacity / 2 && owner.email) {
      const { data: recent } = await db.from("email_log").select("id").eq("event_id", ev.id).eq("kind", "low_signups").gte("created_at", new Date(now - 86400e3).toISOString()).limit(1);
      if (!recent?.length) tally(await deliver(ev, "low_signups", null, owner.email, orgName));
    }
  }
  return { sent, failed };
}
