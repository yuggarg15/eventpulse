import { admin, requireUser } from "@/lib/supabase";
import { Empty } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

export default async function Audience({ searchParams }: PageProps<"/dashboard/audience">) {
  const user = await requireUser();
  const q = String((await searchParams).q ?? "").trim().toLowerCase();
  const db = admin();
  const { data: events } = await db.from("events").select("id,title").eq("owner_id", user.id);
  const ids = (events ?? []).map((e) => e.id);
  const { data: regs } = ids.length ? await db.from("event_registrations").select("id,event_id,name,email,email_norm,status,created_at").in("event_id", ids).neq("status", "cancelled") : { data: [] };
  const { data: cis } = ids.length ? await db.from("event_check_ins").select("registration_id").in("event_id", ids) : { data: [] };
  const attended = new Set((cis ?? []).map((c) => c.registration_id));
  const people = new Map<string, { name: string; email: string; registered: number; attended: number; last: string }>();
  for (const r of regs ?? []) {
    const p = people.get(r.email_norm) ?? { name: r.name, email: r.email, registered: 0, attended: 0, last: r.created_at };
    p.registered++; if (attended.has(r.id)) p.attended++; if (r.created_at > p.last) { p.last = r.created_at; p.name = r.name; }
    people.set(r.email_norm, p);
  }
  const list = [...people.values()].filter((p) => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)).sort((a, b) => b.attended - a.attended || b.registered - a.registered);
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-semibold">Audience</h1><p className="text-sm text-slate-500">Everyone who has registered for your events, across all events. Repeat attendees are your most engaged community.</p></div>
      <div className="grid grid-cols-3 gap-3">
        <div className="card"><p className="text-xs uppercase text-slate-500">People</p><p className="text-2xl font-semibold">{people.size}</p></div>
        <div className="card"><p className="text-xs uppercase text-slate-500">Repeat registrants</p><p className="text-2xl font-semibold">{[...people.values()].filter((p) => p.registered > 1).length}</p></div>
        <div className="card"><p className="text-xs uppercase text-slate-500">Repeat attendees</p><p className="text-2xl font-semibold">{[...people.values()].filter((p) => p.attended > 1).length}</p></div>
      </div>
      <form><input name="q" defaultValue={q} placeholder="Search name or email" className="input max-w-xs" /></form>
      {list.length === 0 ? <Empty title="No audience yet">People appear here after they register for one of your events.</Empty> : (
        <div className="card overflow-x-auto p-0"><table className="w-full min-w-[600px]"><thead className="border-b border-slate-200"><tr>{["Name", "Email", "Registered", "Attended", "Last registered"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{list.slice(0, 200).map((p) => <tr key={p.email}><td className="td font-medium">{p.name}</td><td className="td">{p.email}</td><td className="td">{p.registered}</td><td className="td">{p.attended}</td><td className="td text-slate-600">{fmtDate(p.last)}</td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}
