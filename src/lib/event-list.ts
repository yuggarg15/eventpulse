import { admin } from "./supabase";

export async function listEvents(ownerId: string) {
  const db = admin();
  const { data: events } = await db.from("events").select("id,title,starts_at,status").eq("owner_id", ownerId).order("starts_at", { ascending: false });
  const ids = (events ?? []).map((e) => e.id);
  if (!ids.length) return { events: [], regs: [], checkins: [], clicks: 0, views: 0 };
  const [regs, cis, clicks, views] = await Promise.all([
    db.from("event_registrations").select("event_id,status,link_id").in("event_id", ids),
    db.from("event_check_ins").select("event_id,registration_id").in("event_id", ids),
    db.from("campaign_clicks").select("*", { count: "exact", head: true }).in("event_id", ids),
    db.from("event_page_views").select("*", { count: "exact", head: true }).in("event_id", ids),
  ]);
  return { events: events ?? [], regs: regs.data ?? [], checkins: cis.data ?? [], clicks: clicks.count ?? 0, views: views.count ?? 0 };
}
