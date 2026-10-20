"use client";
import { useTransition } from "react";
import { cancelRegistration } from "@/app/actions";

export function CancelButton({ eventId, regId }: { eventId: string; regId: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn-danger" disabled={pending}
      onClick={() => confirm("Cancel this registration? Their ticket stops working and the spot is freed.") && start(() => cancelRegistration(eventId, regId))}>
      Cancel
    </button>
  );
}
