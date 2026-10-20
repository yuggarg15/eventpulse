import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/supabase";
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
      {rows.length ? <EventTable rows={rows} /> : (
        <Empty title="No events yet"><Link href="/dashboard/events/new" className="btn">Create your first event</Link></Empty>
      )}
    </div>
  );
}
