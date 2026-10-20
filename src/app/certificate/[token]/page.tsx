import { notFound } from "next/navigation";
import { admin } from "@/lib/supabase";
import { fmtDate } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export default async function Certificate({ params }: PageProps<"/certificate/[token]">) {
  const { token } = await params;
  if (!/^[a-f0-9]{20,64}$/.test(token)) notFound();
  const db = admin();
  const { data: reg } = await db.from("event_registrations").select("id,name,status, events(title,starts_at,organizer_name,certificate_text)").eq("ticket_token", token).maybeSingle();
  if (!reg) notFound();
  const ev = reg.events as unknown as { title: string; starts_at: string; organizer_name: string | null; certificate_text: string | null };
  const { data: ci } = await db.from("event_check_ins").select("id").eq("registration_id", reg.id).maybeSingle();
  if (!ci || reg.status !== "confirmed") {
    return <main className="flex flex-1 items-center justify-center p-6 text-center"><p className="text-slate-600">Certificates are issued to attendees who were checked in at the event.</p></main>;
  }
  return (
    <main className="flex flex-1 flex-col items-center gap-4 p-4">
      <div className="print:hidden"><PrintButton label="Download as PDF" /></div>
      <div className="aspect-[1.414/1] w-full max-w-3xl border-[10px] border-double border-indigo-300 bg-white p-8 text-center shadow-sm sm:p-14 print:max-w-none print:shadow-none">
        <p className="text-xs uppercase tracking-[0.3em] text-indigo-600">Certificate of participation</p>
        <p className="mt-8 text-sm text-slate-500">This is to certify that</p>
        <p className="mt-3 font-serif text-3xl font-bold sm:text-5xl">{reg.name}</p>
        <p className="mx-auto mt-6 max-w-lg text-slate-600">{ev.certificate_text || "for attending"} <b className="text-slate-900">{ev.title}</b>, held on {fmtDate(ev.starts_at).replace(/ at .*/, "")}.</p>
        <p className="mt-10 text-sm font-medium">{ev.organizer_name ?? ""}</p>
        <p className="text-xs text-slate-400">Issued via EventPulse · ID {token.slice(0, 8)}</p>
      </div>
    </main>
  );
}
