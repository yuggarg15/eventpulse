import { EventForm } from "@/components/event-form";
import { requireEvent } from "@/lib/supabase";

export default async function Edit({ params }: PageProps<"/dashboard/events/[eventId]/edit">) {
  const { eventId } = await params;
  const { event } = await requireEvent(eventId);
  return <div className="space-y-4"><h1 className="text-2xl font-semibold">Edit event</h1><EventForm event={event} /></div>;
}
