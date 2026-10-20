import Link from "next/link";
import { fmtDate } from "@/lib/utils";

export type EventRowView = { id: string; title: string; starts_at: string; status: string; regs: number; checked: number };

export function EventTable({ rows }: { rows: EventRowView[] }) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[640px]">
        <thead className="border-b border-slate-200"><tr>
          {["Event", "Date", "Status", "Registrations", "Attended", ""].map((h) => <th key={h} className="th">{h}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((e) => (
            <tr key={e.id}>
              <td className="td font-medium">{e.title}</td>
              <td className="td text-slate-600">{fmtDate(e.starts_at)}</td>
              <td className="td"><span className="badge capitalize">{e.status}</span></td>
              <td className="td">{e.regs}</td>
              <td className="td">{e.checked}</td>
              <td className="td text-right"><Link className="btn-ghost" href={`/dashboard/events/${e.id}`}>Manage</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
