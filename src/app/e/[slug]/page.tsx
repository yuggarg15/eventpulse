import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Video } from "lucide-react";
import { admin, getUser } from "@/lib/supabase";
import { attrCookie, clickIsAttributable } from "@/lib/attribution";
import { fmtDate } from "@/lib/utils";
import { RegisterForm } from "@/components/register-form";

export default async function PublicEvent({ params }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const db = admin();
  const { data: ev } = await db.from("events").select("*").eq("slug", slug).maybeSingle();
  if (!ev) notFound();
  const owner = ev.status !== "published" && (await getUser())?.id === ev.owner_id;
  if (ev.status === "draft" && !owner) notFound();

  const open = ev.status === "published" && (!ev.registration_closes_at || new Date(ev.registration_closes_at) > new Date());
  let full = false;
  if (open && ev.capacity) {
    const { count } = await db.from("event_registrations").select("*", { count: "exact", head: true }).eq("event_id", ev.id).eq("status", "confirmed");
    full = (count ?? 0) >= ev.capacity;
  }

  // Record a page view only for real public views of published events
  if (ev.status === "published") {
    const cid = (await cookies()).get(attrCookie(ev.id))?.value;
    let clickId: string | null = null;
    if (cid && /^[0-9a-f-]{36}$/.test(cid)) {
      const { data: click } = await db.from("campaign_clicks").select("id,event_id,created_at").eq("id", cid).maybeSingle();
      if (clickIsAttributable(click, ev.id)) clickId = click!.id;
    }
    await db.from("event_page_views").insert({ event_id: ev.id, click_id: clickId });
  }

  const message = ev.status === "cancelled" ? "This event has been cancelled."
    : ev.status === "completed" || ev.status === "archived" ? "This event has ended."
    : ev.status === "draft" ? "Preview only — this event is not published yet."
    : full ? "This event is full." : !open ? "Registration has closed." : null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 p-4 md:p-8">
      {owner && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Organiser preview ({ev.status}).</p>}
      {ev.banner_url && <img src={ev.banner_url} alt="" className="aspect-[3/1] w-full rounded-xl object-cover" />}
      <div>
        <span className="badge">{ev.category}</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{ev.title}</h1>
      </div>
      <div className="card space-y-2 text-sm">
        <p className="flex items-center gap-2"><Calendar size={16} /> {fmtDate(ev.starts_at)} – {fmtDate(ev.ends_at)}</p>
        {ev.venue && ev.format !== "online" && <p className="flex items-center gap-2"><MapPin size={16} /> {ev.venue}</p>}
        {ev.meeting_link && ev.format !== "in_person" && <p className="flex items-center gap-2"><Video size={16} /> Link shared on your ticket after registering</p>}
        {ev.capacity && <p className="text-slate-500">Capacity: {ev.capacity}</p>}
      </div>
      {ev.description && <p className="whitespace-pre-wrap text-slate-700">{ev.description}</p>}
      {message ? <div className="card text-center font-medium">{message}</div>
        : <RegisterForm slug={ev.slug} askPhone={ev.ask_phone} questions={ev.custom_questions ?? []} />}
    </main>
  );
}
