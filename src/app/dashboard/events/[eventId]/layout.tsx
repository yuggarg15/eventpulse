import Link from "next/link";
import { requireEvent } from "@/lib/supabase";
import { EventTabs } from "@/components/event-tabs";

export default async function EventLayout({ children, params }: LayoutProps<"/dashboard/events/[eventId]">) {
  const { eventId } = await params;
  const { event, role } = await requireEvent(eventId, true);
  return (
    <div className="space-y-5">
      <div>
        <Link href="/dashboard/events" className="text-sm text-slate-500 hover:underline">← My Events</Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{event.title}</h1>
          <span className="badge capitalize">{event.status}</span>
        </div>
      </div>
      <EventTabs role={role} />
      {children}
    </div>
  );
}
