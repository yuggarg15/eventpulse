"use client";
import { useActionState, useTransition } from "react";
import { addMember, removeMember } from "@/app/actions";
import { Field, Msg } from "./ui";

export function AddMember({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(addMember.bind(null, eventId), undefined);
  return (
    <form action={action} className="card space-y-3">
      <h3 className="font-medium">Add a team member</h3>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Their EventPulse email"><input name="email" type="email" required className="input" /></Field>
        <Field label="Role"><select name="role" className="input"><option value="staff">Staff (check-in only)</option><option value="organiser">Organiser (full access)</option></select></Field>
      </div>
      <div className="flex items-center gap-3"><button className="btn" disabled={pending}>Add</button><Msg state={state} /></div>
    </form>
  );
}

export function RemoveMember({ eventId, memberId }: { eventId: string; memberId: string }) {
  const [pending, start] = useTransition();
  return <button className="btn-danger" disabled={pending} onClick={() => confirm("Remove this member?") && start(() => removeMember(eventId, memberId))}>Remove</button>;
}
