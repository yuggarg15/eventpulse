import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/supabase";
import { listEvents } from "@/lib/event-list";
import { Empty } from "@/components/ui";
import { EventTable } from "@/components/event-table";

export default async function Events() {
  const user = await requireUser();
  const d = await listEvents(user.id);
  const rows = d.events.map((e) => ({
    ...e,
    regs: d.regs.filter((r) => r.event_id === e.id && r.status === "confirmed").length,
    checked: d.checkins.filter((c) => c.event_id === e.id).length,
  }));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Events</h1>
        <Link href="/dashboard/events/new" className="btn"><Plus size={16} /> Create event</Link>
      </div>
      {rows.length ? <EventTable rows={rows} /> : <Empty title="No events yet"><Link href="/dashboard/events/new" className="btn">Create your first event</Link></Empty>}
    </div>
  );
}
