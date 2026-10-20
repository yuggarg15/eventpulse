import { notFound } from "next/navigation";
import { admin } from "@/lib/supabase";
import { appUrl, fmtDate } from "@/lib/utils";
import { TicketQr } from "@/components/ticket-qr";
import { CopyButton } from "@/components/copy-button";

const gcal = (ev: { title: string; starts_at: string; ends_at: string; venue: string | null }) => {
  const f = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d+/, "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${f(new Date(ev.starts_at).toISOString())}/${f(new Date(ev.ends_at).toISOString())}&location=${encodeURIComponent(ev.venue ?? "")}`;
};

export default async function Ticket({ params }: PageProps<"/ticket/[token]">) {
  const { token } = await params;
  if (!/^[a-f0-9]{20,64}$/.test(token)) notFound();
  const db = admin();
  const { data: reg } = await db.from("event_registrations").select("id,name,email,status,event_id,created_at,referral_code, events(title,slug,starts_at,ends_at,venue,format,meeting_link)").eq("ticket_token", token).maybeSingle();
  if (!reg) notFound();
  const ev = reg.events as unknown as { title: string; slug: string; starts_at: string; ends_at: string; venue: string | null; format: string; meeting_link: string | null };
  const [{ data: ci }, { data: mail }] = await Promise.all([
    db.from("event_check_ins").select("created_at").eq("registration_id", reg.id).maybeSingle(),
    db.from("email_log").select("status,created_at").eq("registration_id", reg.id).eq("kind", "confirmation").order("created_at", { ascending: false }).limit(1),
  ]);
  let position = 0;
  if (reg.status === "waitlisted") {
    const { count } = await db.from("event_registrations").select("*", { count: "exact", head: true }).eq("event_id", reg.event_id).eq("status", "waitlisted").lte("created_at", reg.created_at);
    position = count ?? 1;
  }
  const ended = new Date(ev.ends_at) < new Date();
  const label = reg.status === "cancelled" ? "Cancelled" : reg.status === "waitlisted" ? `Waitlist #${position}` : ci ? "Checked in" : "Valid";
  const mailStatus = mail?.[0]?.status;
  const share = `${appUrl()}/e/${ev.slug}?ref=${reg.referral_code}`;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center p-4">
      <div className="card w-full space-y-4 text-center">
        <p className={`text-sm font-medium ${reg.status === "confirmed" ? "text-green-700" : "text-amber-700"}`}>
          {reg.status === "confirmed" ? "You're registered! 🎉" : reg.status === "waitlisted" ? "You're on the waitlist" : "Registration cancelled"}
        </p>
        <h1 className="text-2xl font-bold">{ev.title}</h1>
        <p className="text-sm text-slate-600">{fmtDate(ev.starts_at)}{ev.venue ? ` · ${ev.venue}` : ""}</p>
        {ev.meeting_link && ev.format !== "in_person" && reg.status === "confirmed" && <p className="text-sm"><a className="text-indigo-600 underline" href={ev.meeting_link}>Join link</a></p>}
        {reg.status === "confirmed" && <TicketQr value={`${appUrl()}/ticket/${token}`} />}
        {reg.status === "waitlisted" && <p className="text-sm text-slate-600">We&apos;ll email you and this page will show your QR code if a spot opens. Bookmark it.</p>}
        <p className="font-medium">{reg.name}</p>
        <span className="badge">{label}</span>
        {reg.status === "confirmed" && <>
          <p className="text-xs text-slate-500">Show this QR code at the entrance to check in. Bookmark this page. It is your ticket.</p>
          <div className="flex flex-wrap justify-center gap-2"><a className="btn-ghost" href={gcal(ev)} target="_blank" rel="noreferrer">Add to Google Calendar</a>
            {ci && <a className="btn-ghost" href={`/certificate/${token}`}>Certificate</a>}{ended && <a className="btn-ghost" href={`/feedback/${token}`}>Give feedback</a>}</div>
          <div className="rounded-lg bg-indigo-50 p-3 text-left text-sm"><p className="font-medium text-indigo-900">Bring a friend</p>
            <p className="mt-1 break-all text-xs text-indigo-700">{share}</p>
            <div className="mt-2 flex gap-2"><CopyButton text={share} /><a className="btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Join me at ${ev.title}: ${share}`)}`}>WhatsApp</a></div></div>
        </>}
        <p className="text-xs text-slate-400">{mailStatus === "sent" ? `A confirmation email was sent to ${reg.email}.` : mailStatus === "failed" ? "We couldn't email this ticket. Please save this page." : reg.status === "confirmed" ? "No confirmation email was sent. Please save this page." : ""}</p>
      </div>
    </main>
  );
}
