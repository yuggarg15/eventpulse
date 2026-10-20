import { admin, requireEvent } from "@/lib/supabase";
import { loadEventStats } from "@/lib/stats";
import { buildInsights } from "@/lib/insights";
import { daysUntil, fmtDate, fmtPct } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export default async function Report({ params }: PageProps<"/dashboard/events/[eventId]/report">) {
  const { eventId } = await params;
  const { event } = await requireEvent(eventId);
  const { summary: s } = await loadEventStats(eventId);
  const { data: fb } = await admin().from("event_feedback").select("rating").eq("event_id", eventId);
  const avg = fb?.length ? fb.reduce((a, b) => a + b.rating, 0) / fb.length : null;
  const days = daysUntil(event.starts_at);
  const insights = buildInsights(s, { capacity: event.capacity, daysToStart: days, avgRating: avg, feedbackCount: fb?.length ?? 0 });
  return (
    <div className="mx-auto max-w-3xl space-y-5 print:max-w-none">
      <div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold">Event report</h2><p className="text-sm text-slate-500">{event.title} · {fmtDate(event.starts_at)}</p></div><PrintButton /></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Registered", s.confirmed], ["Attended", s.checkedIn], ["Attendance", fmtPct(s.attendance)], ["Link clicks", s.clicks], ["Waitlisted", s.waitlisted], ["Cancelled", s.cancelled], ["Click → reg", fmtPct(s.clickToReg)], ["Avg rating", avg ? avg.toFixed(1) : "—"]].map(([l, v]) => (
          <div key={String(l)} className="card !p-3"><p className="text-xs uppercase text-slate-500">{l}</p><p className="text-xl font-semibold">{v}</p></div>
        ))}
      </div>
      <div className="card"><h3 className="mb-2 font-medium">Highlights</h3><ul className="list-disc space-y-1 pl-5 text-sm">{insights.map((i, k) => <li key={k}>{i.text}</li>)}</ul></div>
      <div className="card overflow-x-auto p-0"><table className="w-full"><thead><tr>{["Channel", "Clicks", "Registrations", "Conversion"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{s.byChannel.map((c) => <tr key={c.channel}><td className="td">{c.channel}</td><td className="td">{c.clicks}</td><td className="td">{c.registrations}</td><td className="td">{fmtPct(c.conversion)}</td></tr>)}</tbody></table></div>
    </div>
  );
}
