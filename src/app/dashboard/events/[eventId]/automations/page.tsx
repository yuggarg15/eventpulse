import { admin, requireEvent } from "@/lib/supabase";
import { ensureAutomations } from "@/lib/automations";
import { emailConfigured } from "@/lib/email";
import { fmtDate } from "@/lib/utils";
import { AutomationCards } from "@/components/automation-cards";
import type { AutomationKind } from "@/lib/automation-defaults";

export default async function Automations({ params }: PageProps<"/dashboard/events/[eventId]/automations">) {
  const { eventId } = await params;
  await requireEvent(eventId);
  const autos = await ensureAutomations(eventId);
  const { data: log } = await admin().from("email_log").select("*").eq("event_id", eventId).order("created_at", { ascending: false }).limit(25);
  return (
    <div className="space-y-5">
      {!emailConfigured() && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Email is not configured (RESEND_API_KEY is missing), so no emails will be delivered. Attempts are logged as “skipped”.</p>}
      <AutomationCards eventId={eventId} autos={autos.map((a) => ({ kind: a.kind as AutomationKind, enabled: a.enabled, offset_hours: a.offset_hours, subject: a.subject, body: a.body }))} />
      <div className="card overflow-x-auto p-0">
        <div className="border-b border-slate-200 px-4 py-3 font-medium">Email log</div>
        <table className="w-full min-w-[640px]">
          <thead><tr>{["When", "Type", "To", "Status", "Detail"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!log?.length && <tr><td className="td text-slate-500" colSpan={5}>No emails yet.</td></tr>}
            {log?.map((l) => (
              <tr key={l.id}><td className="td">{fmtDate(l.created_at)}</td><td className="td">{l.kind}</td><td className="td">{l.to_email}</td>
                <td className="td"><span className={`badge ${l.status === "sent" ? "!bg-green-100 !text-green-700" : l.status === "failed" ? "!bg-red-100 !text-red-700" : ""}`}>{l.status}</span></td>
                <td className="td max-w-xs truncate text-xs text-slate-500">{l.error ?? ""}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
