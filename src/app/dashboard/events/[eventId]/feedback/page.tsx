import { admin, requireEvent } from "@/lib/supabase";
import { fmtDate } from "@/lib/utils";
import { Empty, Stat } from "@/components/ui";

export default async function Feedback({ params }: PageProps<"/dashboard/events/[eventId]/feedback">) {
  const { eventId } = await params;
  await requireEvent(eventId);
  const { data } = await admin().from("event_feedback").select("rating,comment,created_at").eq("event_id", eventId).order("created_at", { ascending: false });
  const rows = data ?? [];
  const avg = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : null;
  if (!rows.length) return <Empty title="No feedback yet">Feedback requests are emailed automatically after the event to attendees who checked in.</Empty>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Average rating" value={`${avg!.toFixed(1)} / 5`} />
        <Stat label="Responses" value={rows.length} />
        {[5, 4, 3, 2, 1].slice(0, 2).map((n) => <Stat key={n} label={`${n}★`} value={rows.filter((r) => r.rating === n).length} />)}
      </div>
      <div className="card divide-y divide-slate-100 p-0">
        {rows.map((r, i) => <div key={i} className="px-4 py-3"><p className="text-sm font-medium">{"★".repeat(r.rating)}<span className="text-slate-300">{"★".repeat(5 - r.rating)}</span> <span className="ml-2 text-xs font-normal text-slate-500">{fmtDate(r.created_at)}</span></p>{r.comment && <p className="mt-1 text-sm text-slate-700">{r.comment}</p>}</div>)}
      </div>
    </div>
  );
}
