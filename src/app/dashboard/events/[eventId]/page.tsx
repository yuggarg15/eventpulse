import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireEvent } from "@/lib/supabase";
import { loadEventStats } from "@/lib/stats";
import { appUrl, fmtDate, fmtPct } from "@/lib/utils";
import { Stat } from "@/components/ui";
import { StatusButtons } from "@/components/status-buttons";

export default async function EventOverview({ params }: PageProps<"/dashboard/events/[eventId]">) {
  const { eventId } = await params;
  const { event } = await requireEvent(eventId);
  const { summary: s } = await loadEventStats(eventId);
  const url = `${appUrl()}/e/${event.slug}`;
  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <p className="text-sm text-slate-600">{fmtDate(event.starts_at)} → {fmtDate(event.ends_at)}</p>
        <p className="text-sm">Public page: <Link className="inline-flex items-center gap-1 text-indigo-600 hover:underline" href={`/e/${event.slug}`} target="_blank">{url} <ExternalLink size={13} /></Link></p>
        {event.status !== "published" && <p className="text-sm text-amber-700">Only you can preview this page. Publish to open registration to everyone.</p>}
        <StatusButtons eventId={event.id} status={event.status} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Registered" value={event.capacity ? `${s.confirmed} / ${event.capacity}` : s.confirmed} />
        <Stat label="Checked in" value={s.checkedIn} />
        <Stat label="Attendance rate" value={fmtPct(s.attendance)} hint="Checked in ÷ confirmed" />
        <Stat label="Link clicks" value={s.clicks} />
      </div>
    </div>
  );
}
