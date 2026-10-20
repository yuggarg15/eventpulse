import Link from "next/link";
import { Plus } from "lucide-react";
import { admin, requireUser } from "@/lib/supabase";
import { CheckCircle2, Circle } from "lucide-react";
import { listEvents } from "@/lib/event-list";
import { fmtPct, pct } from "@/lib/utils";
import { Empty, Stat } from "@/components/ui";
import { EventTable } from "@/components/event-table";

export default async function Overview() {
  const user = await requireUser();
  const d = await listEvents(user.id);
  const confirmed = d.regs.filter((r) => r.status === "confirmed");
  const attributed = confirmed.filter((r) => r.link_id).length;
  const upcoming = d.events.filter((e) => e.status === "published" && new Date(e.starts_at) > new Date()).length;
  const ids = d.events.map((e) => e.id);
  const { count: linkCount } = ids.length ? await admin().from("campaign_links").select("*", { count: "exact", head: true }).in("event_id", ids) : { count: 0 };
  const steps = [
    { done: d.events.length > 0, label: "Create your first event", href: "/dashboard/events/new" },
    { done: d.events.some((e) => e.status === "published"), label: "Publish it", href: d.events[0] ? `/dashboard/events/${d.events[0].id}` : "/dashboard/events/new" },
    { done: (linkCount ?? 0) > 0, label: "Create a tracked link for a channel (WhatsApp, Instagram…)", href: d.events[0] ? `/dashboard/events/${d.events[0].id}/campaigns` : "/dashboard/events/new" },
    { done: confirmed.length > 0, label: "Get your first registration", href: d.events[0] ? `/dashboard/events/${d.events[0].id}/campaigns` : "/dashboard/events/new" },
    { done: d.checkins.length > 0, label: "Check in your first attendee", href: d.events[0] ? `/dashboard/events/${d.events[0].id}/check-in` : "/dashboard/events/new" },
  ];
  const rows = d.events.slice(0, 8).map((e) => ({
    ...e,
    regs: confirmed.filter((r) => r.event_id === e.id).length,
    checked: d.checkins.filter((c) => c.event_id === e.id).length,
  }));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <Link href="/dashboard/events/new" className="btn"><Plus size={16} /> Create event</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Published events" value={d.events.filter((e) => e.status === "published").length} />
        <Stat label="Upcoming" value={upcoming} />
        <Stat label="Registrations" value={confirmed.length} hint="Confirmed registrations" />
        <Stat label="Link clicks" value={d.clicks} hint="Visits to tracked campaign links (not unique people)" />
        <Stat label="Click → registration" value={fmtPct(pct(attributed, d.clicks))} hint="Attributed registrations ÷ clicks" />
        <Stat label="Checked in" value={d.checkins.length} />
      </div>
      {steps.some((x) => !x.done) && (
        <div className="card">
          <p className="mb-3 font-medium">Getting started <span className="text-sm font-normal text-slate-500">({steps.filter((x) => x.done).length}/{steps.length})</span></p>
          <ul className="space-y-2">{steps.map((x) => (
            <li key={x.label} className="flex items-center gap-2 text-sm">{x.done ? <CheckCircle2 size={16} className="text-green-600" /> : <Circle size={16} className="text-slate-300" />}
              {x.done ? <span className="text-slate-400 line-through">{x.label}</span> : <Link className="text-indigo-600 hover:underline" href={x.href}>{x.label}</Link>}</li>))}</ul>
        </div>
      )}
      {rows.length ? <EventTable rows={rows} /> : (
        <Empty title="No events yet"><Link href="/dashboard/events/new" className="btn">Create your first event</Link></Empty>
      )}
    </div>
  );
}
