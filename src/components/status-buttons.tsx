"use client";
import { useTransition } from "react";
import { setEventStatus } from "@/app/actions";

export function StatusButtons({ eventId, status }: { eventId: string; status: string }) {
  const [pending, start] = useTransition();
  const go = (s: string, confirmMsg?: string) => () => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    start(() => setEventStatus(eventId, s));
  };
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "published" && status !== "archived" && <button disabled={pending} onClick={go("published")} className="btn">Publish</button>}
      {status === "published" && <button disabled={pending} onClick={go("draft")} className="btn-ghost">Unpublish</button>}
      {status === "published" && <button disabled={pending} onClick={go("completed")} className="btn-ghost">Mark completed</button>}
      {status !== "cancelled" && status !== "archived" && <button disabled={pending} onClick={go("cancelled", "Cancel this event? Registration will close.")} className="btn-danger">Cancel event</button>}
      {status !== "archived" && <button disabled={pending} onClick={go("archived", "Archive this event?")} className="btn-ghost">Archive</button>}
      {status === "archived" && <button disabled={pending} onClick={go("draft")} className="btn-ghost">Restore as draft</button>}
    </div>
  );
}
