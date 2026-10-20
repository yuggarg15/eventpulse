import { notFound } from "next/navigation";
import { admin } from "@/lib/supabase";
import { appUrl, fmtDate } from "@/lib/utils";
import { TicketQr } from "@/components/ticket-qr";

export default async function Ticket({ params }: PageProps<"/ticket/[token]">) {
  const { token } = await params;
  if (!/^[a-f0-9]{20,64}$/.test(token)) notFound();
  const db = admin();
  const { data: reg } = await db.from("event_registrations").select("id,name,status,event_id, events(title,starts_at,venue,format,meeting_link)").eq("ticket_token", token).maybeSingle();
  if (!reg) notFound();
  const ev = reg.events as unknown as { title: string; starts_at: string; venue: string | null; format: string; meeting_link: string | null };
  const { data: ci } = await db.from("event_check_ins").select("created_at").eq("registration_id", reg.id).maybeSingle();
  const label = reg.status === "cancelled" ? "Cancelled" : ci ? "Checked in" : "Valid";
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center p-4">
      <div className="card w-full space-y-4 text-center">
        <p className="text-sm font-medium text-green-700">{reg.status === "confirmed" ? "You're registered! 🎉" : "Registration cancelled"}</p>
        <h1 className="text-2xl font-bold">{ev.title}</h1>
        <p className="text-sm text-slate-600">{fmtDate(ev.starts_at)}{ev.venue ? ` · ${ev.venue}` : ""}</p>
        {ev.meeting_link && ev.format !== "in_person" && reg.status === "confirmed" && <p className="text-sm"><a className="text-indigo-600 underline" href={ev.meeting_link}>Join link</a></p>}
        {reg.status === "confirmed" && <TicketQr value={`${appUrl()}/ticket/${token}`} />}
        <p className="font-medium">{reg.name}</p>
        <span className="badge">{label}</span>
        <p className="text-xs text-slate-500">Show this QR code at the entrance to check in. Bookmark this page — it is your ticket.</p>
        <p className="text-xs text-slate-400">No confirmation email was sent (email delivery is not set up). Save this page.</p>
      </div>
    </main>
  );
}
