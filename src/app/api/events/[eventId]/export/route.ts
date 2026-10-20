import { NextResponse } from "next/server";
import { admin, getUser } from "@/lib/supabase";

const csv = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: Request, { params }: RouteContext<"/api/events/[eventId]/export">) {
  const { eventId } = await params;
  const user = await getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const db = admin();
  const { data: ev } = await db.from("events").select("id,slug").eq("id", eventId).eq("owner_id", user.id).maybeSingle();
  if (!ev) return new NextResponse("Not found", { status: 404 });
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").toLowerCase(), status = sp.get("status"), src = sp.get("src"), ci = sp.get("ci");
  const [{ data: regs }, { data: cis }] = await Promise.all([
    db.from("event_registrations").select("*").eq("event_id", eventId).order("created_at"),
    db.from("event_check_ins").select("registration_id,created_at").eq("event_id", eventId),
  ]);
  const checked = new Map((cis ?? []).map((c) => [c.registration_id, c.created_at]));
  const rows = (regs ?? []).filter((r) =>
    (!q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)) && (!status || r.status === status) &&
    (!src || (src === "direct" ? !r.utm_source : r.utm_source === src)) && (!ci || (ci === "yes" ? checked.has(r.id) : !checked.has(r.id))));
  const head = ["Name", "Email", "Phone", "Registered at", "Status", "utm_source", "utm_medium", "utm_campaign", "utm_content", "Checked in at", "Answers"];
  const lines = rows.map((r) => [r.name, r.email, r.phone, r.created_at, r.status, r.utm_source, r.utm_medium, r.utm_campaign, r.utm_content, checked.get(r.id), JSON.stringify(r.answers)].map(csv).join(","));
  return new NextResponse([head.map(csv).join(","), ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${ev.slug}-registrations.csv"` },
  });
}
