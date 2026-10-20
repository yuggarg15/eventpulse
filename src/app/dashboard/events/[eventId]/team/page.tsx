import { admin, requireEvent } from "@/lib/supabase";
import { AddMember, RemoveMember } from "@/components/team-forms";

export default async function Team({ params }: PageProps<"/dashboard/events/[eventId]/team">) {
  const { eventId } = await params;
  const { event, role } = await requireEvent(eventId);
  const db = admin();
  const { data: members } = await db.from("event_members").select("id,user_id,role").eq("event_id", eventId);
  const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const email = (id: string) => users.users.find((u) => u.id === id)?.email ?? "Unknown";
  return (
    <div className="space-y-4">
      <div className="card divide-y divide-slate-100 p-0">
        <div className="flex items-center justify-between px-4 py-3"><span className="text-sm">{email(event.owner_id)}</span><span className="badge">Owner</span></div>
        {members?.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm">{email(m.user_id)}</span>
            <div className="flex items-center gap-2"><span className="badge capitalize">{m.role}</span>{role === "owner" && <RemoveMember eventId={eventId} memberId={m.id} />}</div>
          </div>
        ))}
      </div>
      {role === "owner" ? <AddMember eventId={eventId} /> : <p className="text-sm text-slate-500">Only the owner can change the team.</p>}
      <p className="text-xs text-slate-500">Staff see only the check-in screen: ideal for volunteers at the door. Organisers can manage everything except the team.</p>
    </div>
  );
}
