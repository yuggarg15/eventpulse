import { admin } from "./supabase";
import { pct } from "./utils";

export type Link = { id: string; name: string; channel: string; status: string; utm_source: string; utm_medium: string; utm_campaign: string; created_at: string; code: string; utm_content: string | null; utm_term: string | null; description: string | null };
type Click = { id: string; link_id: string; created_at: string };
type View = { click_id: string | null; created_at: string };
type Reg = { id: string; status: string; link_id: string | null; created_at: string };
type CheckIn = { registration_id: string; created_at: string };

export type Summary = ReturnType<typeof summarize>;

// Pure calculation, no database access, so it can be unit-tested.
export function summarize(links: Pick<Link, "id" | "name" | "channel">[], clicks: Click[], views: View[], regs: Reg[], checkins: CheckIn[]) {
  const confirmed = regs.filter((r) => r.status === "confirmed");
  const checkedIds = new Set(checkins.map((c) => c.registration_id));
  const confirmedChecked = confirmed.filter((r) => checkedIds.has(r.id));
  const clickLink = new Map(clicks.map((c) => [c.id, c.link_id]));

  const rows = links.map((l) => {
    const c = clicks.filter((x) => x.link_id === l.id).length;
    const v = views.filter((x) => x.click_id && clickLink.get(x.click_id) === l.id).length;
    const r = confirmed.filter((x) => x.link_id === l.id);
    const ci = r.filter((x) => checkedIds.has(x.id)).length;
    return { id: l.id, name: l.name, channel: l.channel, clicks: c, visits: v, registrations: r.length, checkins: ci, conversion: pct(r.length, c) };
  });

  const attributed = confirmed.filter((r) => r.link_id).length;
  const totalClicks = clicks.length;

  const channels = new Map<string, { channel: string; clicks: number; registrations: number }>();
  for (const r of rows) {
    const e = channels.get(r.channel) ?? { channel: r.channel, clicks: 0, registrations: 0 };
    e.clicks += r.clicks; e.registrations += r.registrations;
    channels.set(r.channel, e);
  }
  const direct = confirmed.length - attributed;
  const byChannel = [...channels.values(), ...(direct > 0 ? [{ channel: "Direct / unknown", clicks: 0, registrations: direct }] : [])]
    .map((c) => ({ ...c, conversion: pct(c.registrations, c.clicks) }));

  // Best campaign = highest conversion among links with at least 5 clicks (avoids "1 click, 1 reg = 100%")
  const eligible = rows.filter((r) => r.clicks >= 5 && r.conversion !== null);
  const best = eligible.sort((a, b) => (b.conversion! - a.conversion!) || b.registrations - a.registrations)[0] ?? null;

  const day = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const trend = new Map<string, { date: string; registrations: number; checkins: number }>();
  const bump = (iso: string, k: "registrations" | "checkins") => {
    const d = day(iso); const e = trend.get(d) ?? { date: d, registrations: 0, checkins: 0 }; e[k]++; trend.set(d, e);
  };
  confirmed.forEach((r) => bump(r.created_at, "registrations"));
  checkins.filter((c) => confirmed.some((r) => r.id === c.registration_id)).forEach((c) => bump(c.created_at, "checkins"));

  return {
    clicks: totalClicks, visits: views.length, confirmed: confirmed.length, cancelled: regs.length - confirmed.length,
    checkedIn: confirmedChecked.length, attributed, direct,
    clickToReg: pct(attributed, totalClicks), attendance: pct(confirmedChecked.length, confirmed.length),
    rows, byChannel, best, trend: [...trend.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function loadEventStats(eventId: string, opts: { from?: string; to?: string; linkId?: string } = {}) {
  const db = admin();
  type Filterable<T> = { gte(c: string, v: string): T; lte(c: string, v: string): T };
  const range = <T extends Filterable<T>>(q: T): T => {
    let r = q;
    if (opts.from) r = r.gte("created_at", new Date(opts.from + "T00:00:00+05:30").toISOString());
    if (opts.to) r = r.lte("created_at", new Date(opts.to + "T23:59:59+05:30").toISOString());
    return r;
  };
  let linksQ = db.from("campaign_links").select("*").eq("event_id", eventId).order("created_at", { ascending: false });
  if (opts.linkId) linksQ = linksQ.eq("id", opts.linkId);
  const [links, clicks, views, regs, cis] = await Promise.all([
    linksQ,
    range(db.from("campaign_clicks").select("id,link_id,created_at").eq("event_id", eventId)),
    range(db.from("event_page_views").select("click_id,created_at").eq("event_id", eventId)),
    range(db.from("event_registrations").select("id,status,link_id,created_at").eq("event_id", eventId)),
    range(db.from("event_check_ins").select("registration_id,created_at").eq("event_id", eventId)),
  ]);
  let c = (clicks.data ?? []) as Click[], v = (views.data ?? []) as View[], r = (regs.data ?? []) as Reg[], ci = (cis.data ?? []) as CheckIn[];
  if (opts.linkId) {
    const ids = new Set(c.map((x) => x.id));
    c = c.filter((x) => x.link_id === opts.linkId); v = v.filter((x) => x.click_id && ids.has(x.click_id));
    r = r.filter((x) => x.link_id === opts.linkId); const rid = new Set(r.map((x) => x.id)); ci = ci.filter((x) => rid.has(x.registration_id));
  }
  return { links: (links.data ?? []) as Link[], summary: summarize((links.data ?? []) as Link[], c, v, r, ci) };
}
