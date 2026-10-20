"use client";
import { useActionState, useState, useTransition } from "react";
import { runNow, saveAutomation, sendBroadcast } from "@/app/actions";
import { AUTOMATION_META, type AutomationKind } from "@/lib/automation-defaults";
import { Field, Msg } from "./ui";

type Auto = { kind: AutomationKind; enabled: boolean; offset_hours: number; subject: string; body: string };

function Card({ eventId, a }: { eventId: string; a: Auto }) {
  const meta = AUTOMATION_META[a.kind];
  const [state, action, pending] = useActionState(saveAutomation.bind(null, eventId, a.kind), undefined);
  const [open, setOpen] = useState(false);
  return (
    <form action={action} className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="font-medium">{meta.title}</h3><p className="text-sm text-slate-500">{meta.when}</p></div>
        <label className="flex shrink-0 items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={a.enabled} /> On</label>
      </div>
      <button type="button" className="text-sm text-indigo-600" onClick={() => setOpen(!open)}>{open ? "Hide message" : "Edit message"}</button>
      <div className={open ? "space-y-3" : "hidden"}>
        {meta.offset && <Field label={`Send ${meta.offset}`}><input name="offset_hours" type="number" min={0} defaultValue={a.offset_hours} className="input max-w-32" /></Field>}
        {!meta.offset && <input type="hidden" name="offset_hours" value={a.offset_hours} />}
        <Field label="Subject"><input name="subject" defaultValue={a.subject} className="input" /></Field>
        <Field label="Message" hint="Variables: {{name}} {{event}} {{date}} {{venue}} {{organizer}}"><textarea name="body" rows={5} defaultValue={a.body} className="input" /></Field>
      </div>
      <div className="flex items-center gap-3"><button className="btn" disabled={pending}>{pending ? "Saving…" : "Save"}</button><Msg state={state} /></div>
    </form>
  );
}

export function AutomationCards({ eventId, autos }: { eventId: string; autos: Auto[] }) {
  const [res, setRes] = useState<{ error?: string; ok?: string }>();
  const [pending, start] = useTransition();
  const [bState, bAction, bPending] = useActionState(sendBroadcast.bind(null, eventId), undefined);
  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-medium">Run automations now</p><p className="text-sm text-slate-500">They also run automatically every hour once deployed.</p></div>
        <div className="flex items-center gap-3">
          {res && <Msg state={res} />}
          <button className="btn" disabled={pending} onClick={() => start(async () => setRes(await runNow(eventId)))}>{pending ? "Running…" : "Run now"}</button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">{autos.map((a) => <Card key={a.kind} eventId={eventId} a={a} />)}</div>
      <form action={bAction} className="card space-y-3">
        <h3 className="font-medium">Send a one-off message</h3>
        <Field label="Audience">
          <select name="who" className="input max-w-xs"><option value="all">All confirmed attendees</option><option value="attended">Attended only</option><option value="absent">Did not attend</option></select>
        </Field>
        <Field label="Subject"><input name="subject" required className="input" /></Field>
        <Field label="Message"><textarea name="body" required rows={4} className="input" /></Field>
        <div className="flex items-center gap-3"><button className="btn" disabled={bPending}>{bPending ? "Sending…" : "Send"}</button><Msg state={bState} /></div>
      </form>
    </div>
  );
}
