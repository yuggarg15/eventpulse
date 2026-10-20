"use client";
import { useActionState } from "react";
import { saveProfile } from "@/app/actions";
import { Field, Msg } from "./ui";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  return (
    <form action={action} className="card max-w-md space-y-3">
      <Field label="Email"><input value={email} disabled className="input bg-slate-50" readOnly /></Field>
      <Field label="Display name" hint="Used as the sender name in emails and on certificates"><input name="display_name" defaultValue={name} className="input" /></Field>
      <div className="flex items-center gap-3"><button className="btn" disabled={pending}>Save</button><Msg state={state} /></div>
    </form>
  );
}
