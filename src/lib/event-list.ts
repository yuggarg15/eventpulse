import { admin } from "./supabase";

// Events the user owns or has been added to as an organiser.
export async function listEvents(userId: string) {
  const db = admin();
  const [{ data: owned }, { data: mem }] = await Promise.all([
    db.from("events").select("id,title,starts_at,ends_at,status,capacity,slug,owner_id").eq("owner_id", userId),
    db.from("event_members").select("event_id").eq("user_id", userId).eq("role", "organiser"),
  ]);
  const memberIds = (mem ?? []).map((m) => m.event_id);
  const { data: shared } = memberIds.length ? await db.from("events").select("id,title,starts_at,ends_at,status,capacity,slug,owner_id").in("id", memberIds) : { data: [] };
  const events = [...(owned ?? []), ...(shared ?? [])].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const ids = events.map((e) => e.id);
  if (!ids.length) return { events: [], regs: [], checkins: [], clicks: 0, views: 0 };
  const [regs, cis, clicks, views] = await Promise.all([
    db.from("event_registrations").select("event_id,status,link_id").in("event_id", ids),
    db.from("event_check_ins").select("event_id,registration_id").in("event_id", ids),
    db.from("campaign_clicks").select("*", { count: "exact", head: true }).in("event_id", ids),
    db.from("event_page_views").select("*", { count: "exact", head: true }).in("event_id", ids),
  ]);
  return { events, regs: regs.data ?? [], checkins: cis.data ?? [], clicks: clicks.count ?? 0, views: views.count ?? 0 };
}

// Pooled attendance history from an owner's finished events (feeds the turnout forecast).
export async function ownerHistory(ownerId: string, excludeEventId?: string) {
  const db = admin();
  const { data: evs } = await db.from("events").select("id").eq("owner_id", ownerId).lt("ends_at", new Date().toISOString());
  const ids = (evs ?? []).map((e) => e.id).filter((i) => i !== excludeEventId);
  if (!ids.length) return [];
  const [{ data: regs }, { data: cis }] = await Promise.all([
    db.from("event_registrations").select("event_id").in("event_id", ids).eq("status", "confirmed"),
    db.from("event_check_ins").select("event_id").in("event_id", ids),
  ]);
  return ids.map((id) => ({ confirmed: (regs ?? []).filter((r) => r.event_id === id).length, checked: (cis ?? []).filter((c) => c.event_id === id).length }));
}
