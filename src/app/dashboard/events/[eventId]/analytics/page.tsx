import { requireEvent } from "@/lib/supabase";
import { loadEventStats } from "@/lib/stats";
import { fmtPct } from "@/lib/utils";
import { Stat } from "@/components/ui";
import { ChannelChart, TrendChart } from "@/components/charts";

export default async function Analytics({ params, searchParams }: PageProps<"/dashboard/events/[eventId]/analytics">) {
  const { eventId } = await params;
  const sp = await searchParams;
  await requireEvent(eventId);
  const from = String(sp.from ?? ""), to = String(sp.to ?? ""), link = String(sp.link ?? "");
  const { links, summary: s } = await loadEventStats(eventId, { from: from || undefined, to: to || undefined, linkId: link || undefined });
  return (
    <div className="space-y-5">
      <form className="flex flex-wrap items-end gap-2">
        <div><label className="label">From</label><input type="date" name="from" defaultValue={from} className="input" /></div>
        <div><label className="label">To</label><input type="date" name="to" defaultValue={to} className="input" /></div>
        <div><label className="label">Campaign</label>
          <select name="link" defaultValue={link} className="input"><option value="">All campaigns</option>{links.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        <button className="btn">Apply</button>
      </form>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Clicks" value={s.clicks} hint="Visits to tracked links, not unique people" />
        <Stat label="Page visits" value={s.visits} hint="Event pages loaded (all traffic)" />
        <Stat label="Registrations" value={s.confirmed} hint={`${s.cancelled} cancelled`} />
        <Stat label="Checked in" value={s.checkedIn} />
        <Stat label="Click → registration" value={fmtPct(s.clickToReg)} hint="Attributed registrations ÷ clicks" />
        <Stat label="Attendance rate" value={fmtPct(s.attendance)} hint="Checked in ÷ confirmed registrations" />
        <Stat label="Attributed" value={s.attributed} hint="Registrations from a tracked link" />
        <Stat label="Direct / unknown" value={s.direct} hint="No tracked link" />
      </div>
      <div className="card text-sm">
        <strong>Best campaign: </strong>
        {s.best ? `${s.best.name} — ${fmtPct(s.best.conversion)} conversion (${s.best.registrations} registrations from ${s.best.clicks} clicks)` : "Not enough data yet (needs a campaign with at least 5 clicks)."}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><h3 className="mb-3 font-medium">Clicks vs registrations by channel</h3>
          {s.byChannel.length ? <ChannelChart data={s.byChannel} /> : <p className="py-10 text-center text-sm text-slate-500">No data yet.</p>}</div>
        <div className="card"><h3 className="mb-3 font-medium">Registrations & check-ins over time</h3>
          {s.trend.length >= 2 ? <TrendChart data={s.trend} /> : <p className="py-10 text-center text-sm text-slate-500">A trend needs data from at least 2 different days.</p>}</div>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[600px]">
          <thead className="border-b border-slate-200"><tr>{["Campaign", "Channel", "Clicks", "Visits", "Registrations", "Check-ins", "Conversion"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {s.rows.length === 0 && <tr><td className="td text-slate-500" colSpan={7}>No campaigns yet.</td></tr>}
            {s.rows.map((r) => <tr key={r.id}><td className="td font-medium">{r.name}</td><td className="td">{r.channel}</td><td className="td">{r.clicks}</td><td className="td">{r.visits}</td><td className="td">{r.registrations}</td><td className="td">{r.checkins}</td><td className="td">{fmtPct(r.conversion)}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Conversion compares volume and rate: a link with few clicks can convert better than a busy one.</p>
    </div>
  );
}
