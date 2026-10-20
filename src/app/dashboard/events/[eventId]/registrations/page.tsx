import { Download } from "lucide-react";
import { admin, requireEvent } from "@/lib/supabase";
import { fmtDate } from "@/lib/utils";
import { CancelButton } from "@/components/cancel-button";
import { Empty } from "@/components/ui";

export default async function Registrations({ params, searchParams }: PageProps<"/dashboard/events/[eventId]/registrations">) {
  const { eventId } = await params;
  const sp = await searchParams;
  const { event } = await requireEvent(eventId);
  const q = String(sp.q ?? "").trim().toLowerCase();
  const status = String(sp.status ?? ""), src = String(sp.src ?? ""), ci = String(sp.ci ?? "");
  const db = admin();
  const [{ data: regs }, { data: cis }] = await Promise.all([
    db.from("event_registrations").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
    db.from("event_check_ins").select("registration_id,created_at").eq("event_id", eventId),
  ]);
  const checked = new Map((cis ?? []).map((c) => [c.registration_id, c.created_at]));
  const sources = [...new Set((regs ?? []).map((r) => r.utm_source).filter(Boolean))] as string[];
  const rows = (regs ?? []).filter((r) =>
    (!q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)) &&
    (!status || r.status === status) &&
    (!src || (src === "direct" ? !r.utm_source : r.utm_source === src)) &&
    (!ci || (ci === "yes" ? checked.has(r.id) : !checked.has(r.id))));
  const refCount = new Map<string, number>();
  for (const r of regs ?? []) if (r.referred_by && r.status === "confirmed") refCount.set(r.referred_by, (refCount.get(r.referred_by) ?? 0) + 1);
  const top = (regs ?? []).filter((r) => refCount.has(r.id)).sort((a, b) => refCount.get(b.id)! - refCount.get(a.id)!).slice(0, 5);
  const exportQs = new URLSearchParams({ q, status, src, ci }).toString();
  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-2">
        <input name="q" defaultValue={q} placeholder="Search name or email" className="input max-w-xs" />
        <select name="status" defaultValue={status} className="input w-auto"><option value="">All statuses</option><option value="confirmed">Confirmed</option><option value="waitlisted">Waitlisted</option><option value="cancelled">Cancelled</option></select>
        <select name="src" defaultValue={src} className="input w-auto"><option value="">All sources</option><option value="direct">Direct / unknown</option>{sources.map((s) => <option key={s}>{s}</option>)}</select>
        <select name="ci" defaultValue={ci} className="input w-auto"><option value="">Any check-in</option><option value="yes">Checked in</option><option value="no">Not checked in</option></select>
        <button className="btn-ghost">Filter</button>
        <a className="btn-ghost ml-auto" href={`/api/events/${eventId}/export?${exportQs}`}><Download size={14} /> Export CSV</a>
      </form>
      {top.length > 0 && (
        <div className="card"><p className="mb-2 text-sm font-medium">Top referrers</p>
          <ol className="space-y-1 text-sm">{top.map((t, i) => <li key={t.id}>{i + 1}. {t.name} <span className="text-slate-500">: {refCount.get(t.id)} referral{refCount.get(t.id)! > 1 ? "s" : ""}</span></li>)}</ol></div>
      )}
      {rows.length === 0 ? <Empty title={regs?.length ? "No registrations match these filters" : "No registrations yet"} /> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[800px]">
            <thead className="border-b border-slate-200"><tr>{["Name", "Email", "Phone", "Registered", "Status", "Source", "Referrals", "Checked in", "Answers", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="td font-medium">{r.name}</td><td className="td">{r.email}</td><td className="td">{r.phone ?? "—"}</td>
                  <td className="td text-slate-600">{fmtDate(r.created_at)}</td>
                  <td className="td"><span className="badge capitalize">{r.status}</span></td>
                  <td className="td">{r.utm_source ? `${r.utm_source} / ${r.utm_campaign}` : "Direct"}</td>
                  <td className="td">{refCount.get(r.id) ?? "—"}</td><td className="td">{checked.has(r.id) ? "Yes" : "—"}</td>
                  <td className="td text-xs text-slate-600">{Object.entries(r.answers ?? {}).map(([k, v]) => <div key={k}>{k}: {String(v)}</div>)}</td>
                  <td className="td">{r.status !== "cancelled" && <CancelButton eventId={event.id} regId={r.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
