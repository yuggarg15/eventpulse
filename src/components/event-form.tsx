"use client";
import { useActionState, useState } from "react";
import { saveEvent } from "@/app/actions";
import { isoToIstInput, slugify } from "@/lib/utils";
import type { EventRow } from "@/lib/supabase";
import { Field, Msg } from "./ui";

export function EventForm({ event }: { event?: EventRow }) {
  const [state, action, pending] = useActionState(saveEvent, undefined);
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [touched, setTouched] = useState(!!event);
  const q = event?.custom_questions ?? [];
  const q1 = q.find((x) => x.type === "text"), q2 = q.find((x) => x.type === "choice");
  return (
    <form action={action} className="card space-y-4">
      {event && <input type="hidden" name="id" value={event.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title"><input name="title" required defaultValue={event?.title} className="input"
          onChange={(e) => !touched && setSlug(slugify(e.target.value))} /></Field>
        <Field label="URL slug" hint={`Public link: /e/${slug || "your-event"}`}>
          <input name="slug" value={slug} onChange={(e) => { setTouched(true); setSlug(slugify(e.target.value)); }} className="input" />
        </Field>
      </div>
      <Field label="Description"><textarea name="description" rows={4} defaultValue={event?.description} className="input" /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Category"><input name="category" defaultValue={event?.category ?? "Workshop"} className="input" /></Field>
        <Field label="Format">
          <select name="format" defaultValue={event?.format ?? "in_person"} className="input">
            <option value="in_person">In person</option><option value="online">Online</option><option value="hybrid">Hybrid</option>
          </select>
        </Field>
        <Field label="Capacity" hint="Leave empty for unlimited"><input name="capacity" type="number" min={1} defaultValue={event?.capacity ?? ""} className="input" /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Venue / address"><input name="venue" defaultValue={event?.venue ?? ""} className="input" /></Field>
        <Field label="Meeting link (online/hybrid)"><input name="meeting_link" defaultValue={event?.meeting_link ?? ""} className="input" /></Field>
      </div>
      <Field label="Banner image URL (optional)"><input name="banner_url" type="url" defaultValue={event?.banner_url ?? ""} className="input" /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Starts (IST)"><input name="starts_at" type="datetime-local" required defaultValue={event ? isoToIstInput(event.starts_at) : ""} className="input" /></Field>
        <Field label="Ends (IST)"><input name="ends_at" type="datetime-local" required defaultValue={event ? isoToIstInput(event.ends_at) : ""} className="input" /></Field>
        <Field label="Registration closes (IST)" hint="Optional"><input name="registration_closes_at" type="datetime-local" defaultValue={event?.registration_closes_at ? isoToIstInput(event.registration_closes_at) : ""} className="input" /></Field>
      </div>
      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium">Registration form</legend>
        <p className="text-xs text-slate-500">Name and email are always asked.</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ask_phone" defaultChecked={event?.ask_phone} /> Ask for phone number</label>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Short-text question (optional)"><input name="q1_label" defaultValue={q1?.label} className="input" placeholder="e.g. Which college are you from?" /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="q1_required" defaultChecked={q1?.required} /> Required</label>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Choice question (optional)"><input name="q2_label" defaultValue={q2?.label} className="input" placeholder="e.g. T-shirt size" /></Field>
          <Field label="Options, comma separated"><input name="q2_options" defaultValue={q2?.options?.join(", ")} className="input" placeholder="S, M, L" /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="q2_required" defaultChecked={q2?.required} /> Required</label>
        </div>
      </fieldset>
      <Msg state={state} />
      <button className="btn" disabled={pending}>{pending ? "Saving…" : event ? "Save changes" : "Create event"}</button>
    </form>
  );
}
