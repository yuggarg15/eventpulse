import Link from "next/link";
import { Copy, ExternalLink, FileText } from "lucide-react";
import { duplicateEvent } from "@/app/actions";
import { requireEvent } from "@/lib/supabase";
import { loadEventStats } from "@/lib/stats";
import { ownerHistory } from "@/lib/event-list";
import { forecastTurnout, showRate } from "@/lib/insights";
import { appUrl, fmtDate, fmtPct } from "@/lib/utils";
import { Stat } from "@/components/ui";
import { StatusButtons } from "@/components/status-buttons";

export default async function EventOverview({ params }: PageProps<"/dashboard/events/[eventId]">) {
  const { eventId } = await params;
  const { event } = await requireEvent(eventId);
  const [{ summary: s }, history] = await Promise.all([loadEventStats(eventId), ownerHistory(event.owner_id, eventId)]);
  const sr = showRate(history);
  const upcoming = new Date(event.ends_at) > new Date();
  const url = `${appUrl()}/e/${event.slug}`;
  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <p className="text-sm text-slate-600">{fmtDate(event.starts_at)} → {fmtDate(event.ends_at)}</p>
        <p className="text-sm">Public page: <Link className="inline-flex items-center gap-1 text-indigo-600 hover:underline" href={`/e/${event.slug}`} target="_blank">{url} <ExternalLink size={13} /></Link></p>
        {event.status !== "published" && <p className="text-sm text-amber-700">Only you can preview this page. Publish to open registration to everyone.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <StatusButtons eventId={event.id} status={event.status} />
          <Link href={`/dashboard/events/${event.id}/report`} className="btn-ghost"><FileText size={14} /> Report</Link>
          <form action={duplicateEvent.bind(null, event.id)}><button className="btn-ghost"><Copy size={14} /> Duplicate</button></form>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Registered" value={event.capacity ? `${s.confirmed} / ${event.capacity}` : s.confirmed} hint={s.waitlisted ? `${s.waitlisted} on waitlist` : undefined} />
        <Stat label="Checked in" value={s.checkedIn} />
        <Stat label="Attendance rate" value={fmtPct(s.attendance)} hint="Checked in ÷ confirmed" />
        <Stat label="Link clicks" value={s.clicks} />
      </div>
      {upcoming && s.confirmed > 0 && (
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Expected turnout</p>
          <p className="mt-1 text-2xl font-semibold">~{forecastTurnout(s.confirmed, sr.rate)} people</p>
          <p className="mt-1 text-xs text-slate-500">{sr.basedOnHistory ? `Based on a ${Math.round(sr.rate * 100)}% show-up rate from your past events.` : "Estimate using a typical 70% show-up rate. It becomes personalised after you've run events with check-in."}</p>
        </div>
      )}
    </div>
  );
}
