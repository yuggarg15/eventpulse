// DEMO DATA ONLY. Creates a clearly labelled demo organiser with fake events so the dashboard can be shown off.
// Usage:  node --env-file=.env.local scripts/seed.mjs          (create)
//         node --env-file=.env.local scripts/seed.mjs --reset  (delete the demo account and all its data)
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const EMAIL = "demo@eventpulse.demo", PASSWORD = "DemoPass123!";
const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const day = 86400e3;

const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
const existing = list.users.find((u) => u.email === EMAIL);
if (existing) { await db.auth.admin.deleteUser(existing.id); console.log("Removed previous demo account."); }
if (process.argv.includes("--reset")) process.exit(0);

const { data: u, error } = await db.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { display_name: "Demo Organiser (fake data)" } });
if (error) throw error;

const channels = [
  { name: "WhatsApp College Groups", channel: "WhatsApp", s: "whatsapp", m: "messaging", clicks: 140, conv: 0.14 },
  { name: "Instagram Story", channel: "Instagram", s: "instagram", m: "social", clicks: 70, conv: 0.30 },
  { name: "Poster QR", channel: "QR / Poster", s: "poster", m: "offline", clicks: 45, conv: 0.22 },
  { name: "Email Newsletter", channel: "Email", s: "email", m: "email", clicks: 60, conv: 0.18 },
];
const first = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Ananya", "Vihaan", "Ishita", "Arjun", "Saanvi", "Reyansh", "Kavya", "Dev", "Tara", "Yash", "Nisha"];
const last = ["Sharma", "Verma", "Gupta", "Patel", "Singh", "Mehta", "Iyer", "Nair", "Reddy", "Joshi"];

async function makeEvent({ title, slug, start, past, regsTarget }) {
  const starts = new Date(start), ends = new Date(start + 4 * 3600e3);
  const { data: ev } = await db.from("events").insert({
    owner_id: u.user.id, slug, title: `[DEMO] ${title}`, description: "Demo event with fake data created by the seed script.", category: "Hackathon",
    venue: "Demo Auditorium, Delhi", starts_at: starts.toISOString(), ends_at: ends.toISOString(), capacity: 200, waitlist_enabled: true,
    status: past ? "completed" : "published", organizer_name: "Demo Tech Club", certificate_text: "for participating in the hackathon",
  }).select().single();
  let n = 0;
  for (const c of channels) {
    const { data: link } = await db.from("campaign_links").insert({ event_id: ev.id, code: hex(4), name: c.name, channel: c.channel, utm_source: c.s, utm_medium: c.m, utm_campaign: slug.replace(/-/g, "_") }).select().single();
    const clicks = [];
    for (let i = 0; i < c.clicks; i++) clicks.push({ link_id: link.id, event_id: ev.id, created_at: new Date(start - Math.random() * 14 * day).toISOString() });
    const { data: cl } = await db.from("campaign_clicks").insert(clicks).select("id,created_at");
    await db.from("event_page_views").insert(cl.slice(0, Math.floor(cl.length * 0.9)).map((k) => ({ event_id: ev.id, click_id: k.id, created_at: k.created_at })));
    const count = Math.round(c.clicks * c.conv * (regsTarget / 80));
    for (let i = 0; i < count && n < regsTarget; i++, n++) {
      const name = `${pick(first)} ${pick(last)}`, k = cl[i % cl.length];
      const { data: r } = await db.from("event_registrations").insert({
        event_id: ev.id, name, email: `demo${slug}${n}@example.com`, email_norm: `demo${slug}${n}@example.com`, ticket_token: hex(18), referral_code: hex(4),
        link_id: link.id, click_id: k.id, utm_source: c.s, utm_medium: c.m, utm_campaign: slug.replace(/-/g, "_"), created_at: k.created_at,
      }).select("id").single();
      if (past && Math.random() < 0.72) {
        await db.from("event_check_ins").insert({ registration_id: r.id, event_id: ev.id, checked_in_by: u.user.id });
        if (Math.random() < 0.6) await db.from("event_feedback").insert({ event_id: ev.id, registration_id: r.id, rating: pick([3, 4, 4, 5, 5, 5]), comment: pick(["Great event!", "Loved the mentors.", "Could start on time.", null]) });
      }
    }
  }
  for (let i = 0; i < Math.round(regsTarget * 0.15); i++) {  // direct, untracked registrations
    const e = `demo${slug}direct${i}@example.com`;
    await db.from("event_registrations").insert({ event_id: ev.id, name: `${pick(first)} ${pick(last)}`, email: e, email_norm: e, ticket_token: hex(18), referral_code: hex(4), created_at: new Date(start - Math.random() * 10 * day).toISOString() });
  }
  return ev;
}

await makeEvent({ title: "Tech Hackathon 2025", slug: "demo-hackathon-2025", start: Date.now() - 20 * day, past: true, regsTarget: 90 });
await makeEvent({ title: "AI Workshop", slug: "demo-ai-workshop", start: Date.now() + 9 * day, past: false, regsTarget: 40 });
console.log(`Done. Log in with ${EMAIL} / ${PASSWORD}  (all data is fake and prefixed [DEMO]).`);
