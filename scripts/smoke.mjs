// Database smoke test: registration, duplicates, capacity, waitlist promotion, tracking. Cleans up after itself.
import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const base = process.env.SMOKE_BASE || "http://localhost:3000";
const ok = (label, cond) => { console.log(cond ? "PASS" : "FAIL", label); if (!cond) process.exitCode = 1; };
const { data: u } = await db.auth.admin.createUser({ email: `smoke${Date.now()}@example.com`, password: "secret123", email_confirm: true });
const slug = "smoke-" + Date.now();
const { data: ev } = await db.from("events").insert({ owner_id: u.user.id, slug, title: "Smoke", starts_at: "2030-01-01T10:00:00Z", ends_at: "2030-01-01T12:00:00Z", capacity: 1, waitlist_enabled: true, status: "published" }).select().single();
const reg = (email, tok, ref = null) => db.rpc("register_attendee", { p_event_id: ev.id, p_name: "T", p_email: email, p_phone: null, p_answers: {}, p_token: tok, p_link_id: null, p_click_id: null, p_utm_source: null, p_utm_medium: null, p_utm_campaign: null, p_utm_content: null, p_ref_code: tok.slice(0, 8), p_referrer_code: ref });
const a = (await reg("a@x.com", "a".repeat(36))).data;
ok("first registration confirmed", a.status === "confirmed");
ok("duplicate blocked", (await reg(" A@x.com", "b".repeat(36))).data.error === "duplicate");
const b = (await reg("b@x.com", "c".repeat(36), "aaaaaaaa")).data;
ok("full event -> waitlisted", b.status === "waitlisted");
const { data: rb } = await db.from("event_registrations").select("referred_by").eq("id", b.id).single();
ok("referral linked", !!rb.referred_by);
await db.from("event_registrations").update({ status: "cancelled" }).eq("id", a.id);
const { data: promoted } = await db.rpc("promote_waitlist", { p_event_id: ev.id });
ok("waitlist promoted after cancel", promoted?.length === 1 && promoted[0] === b.id);
ok("no second promotion beyond capacity", ((await db.rpc("promote_waitlist", { p_event_id: ev.id })).data ?? []).length === 0);
await db.from("event_automations").insert({ event_id: ev.id, kind: "confirmation", subject: "Hi {{name}}", body: "x" });
for (const p of ["/", "/login", "/signup", "/privacy", `/e/${slug}`, `/ticket/${"c".repeat(36)}`, `/feedback/${"c".repeat(36)}`, `/api/qr/${"c".repeat(36)}`, "/dashboard"]) {
  const r = await fetch(base + p, { redirect: "manual" });
  ok(`GET ${p} -> ${r.status}`, p === "/dashboard" ? r.status === 307 : r.status === 200);
}
const cron = await fetch(base + "/api/cron/run", { method: "POST", redirect: "manual" });
ok("cron rejects without secret", cron.status === 401);
const cron2 = await fetch(base + "/api/cron/run", { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
ok("cron runs with secret", cron2.status === 200);
await db.from("events").delete().eq("id", ev.id); await db.auth.admin.deleteUser(u.user.id);
