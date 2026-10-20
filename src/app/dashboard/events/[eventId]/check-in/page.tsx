import { admin, requireEvent } from "@/lib/supabase";
import { CheckIn } from "@/components/checkin";

export default async function CheckInPage({ params }: PageProps<"/dashboard/events/[eventId]/check-in">) {
  const { eventId } = await params;
  await requireEvent(eventId);
  const db = admin();
  const [{ data: regs }, { data: cis }] = await Promise.all([
    db.from("event_registrations").select("id,name,email").eq("event_id", eventId).eq("status", "confirmed").order("name"),
    db.from("event_check_ins").select("registration_id").eq("event_id", eventId),
  ]);
  const done = new Set((cis ?? []).map((c) => c.registration_id));
  const attendees = (regs ?? []).map((r) => ({ ...r, checkedIn: done.has(r.id) }));
  return <CheckIn eventId={eventId} attendees={attendees} confirmed={attendees.length} />;
}
