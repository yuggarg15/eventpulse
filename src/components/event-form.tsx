"use client";
import { useActionState, useState } from "react";
import { saveEvent } from "@/app/actions";
import { isoToIstInput, slugify } from "@/lib/utils";
import type { EventRow } from "@/lib/supabase";
import { Field, Msg } from "./ui";

export function EventForm({ event, prefill }: { event?: EventRow; prefill?: Partial<EventRow> }) {
  const [state, action, pending] = useActionState(saveEvent, undefined);
  const e: Partial<EventRow> | undefined = event ?? prefill;
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [touched, setTouched] = useState(!!event);
  const q = e?.custom_questions ?? [];
  const q1 = q.find((x) => x.type === "text"), q2 = q.find((x) => x.type === "choice");
  return (
    <form action={action} className="card space-y-5">
      {event && <input type="hidden" name="id" value={event.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title"><input name="title" required defaultValue={event?.title} className="input" onChange={(ev) => !touched && setSlug(slugify(ev.target.value))} /></Field>
        <Field label="URL slug" hint={`Public link: /e/${slug || "your-event"}`}>
          <input name="slug" value={slug} onChange={(ev) => { setTouched(true); setSlug(slugify(ev.target.value)); }} className="input" />
        </Field>
      </div>
      <Field label="Description"><textarea name="description" rows={5} defaultValue={e?.description} className="input" /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Category"><input name="category" defaultValue={e?.category ?? "Workshop"} className="input" /></Field>
        <Field label="Format">
          <select name="format" defaultValue={e?.format ?? "in_person"} className="input">
            <option value="in_person">In person</option><option value="online">Online</option><option value="hybrid">Hybrid</option>
          </select>
        </Field>
        <Field label="Capacity" hint="Leave empty for unlimited"><input name="capacity" type="number" min={1} defaultValue={e?.capacity ?? ""} className="input" /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="waitlist_enabled" defaultChecked={e?.waitlist_enabled} /> When full, let people join a waitlist (auto-promoted when spots open)</label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Venue / address"><input name="venue" defaultValue={e?.venue ?? ""} className="input" /></Field>
        <Field label="Meeting link (online/hybrid)"><input name="meeting_link" defaultValue={e?.meeting_link ?? ""} className="input" /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Banner image" hint="PNG, JPG or WebP, up to 3 MB"><input name="banner" type="file" accept="image/png,image/jpeg,image/webp" className="input" /></Field>
        <Field label="…or banner image URL"><input name="banner_url" type="url" defaultValue={e?.banner_url ?? ""} className="input" /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Starts (IST)"><input name="starts_at" type="datetime-local" required defaultValue={event ? isoToIstInput(event.starts_at) : ""} className="input" /></Field>
        <Field label="Ends (IST)"><input name="ends_at" type="datetime-local" required defaultValue={event ? isoToIstInput(event.ends_at) : ""} className="input" /></Field>
        <Field label="Registration closes (IST)" hint="Optional"><input name="registration_closes_at" type="datetime-local" defaultValue={event?.registration_closes_at ? isoToIstInput(event.registration_closes_at) : ""} className="input" /></Field>
      </div>
      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium">Registration form</legend>
        <p className="text-xs text-slate-500">Name and email are always asked.</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ask_phone" defaultChecked={e?.ask_phone} /> Ask for phone number</label>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Short-text question (optional)"><input name="q1_label" defaultValue={q1?.label} className="input" /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="q1_required" defaultChecked={q1?.required} /> Required</label>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Choice question (optional)"><input name="q2_label" defaultValue={q2?.label} className="input" /></Field>
          <Field label="Options, comma separated"><input name="q2_options" defaultValue={q2?.options?.join(", ")} className="input" placeholder="S, M, L" /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="q2_required" defaultChecked={q2?.required} /> Required</label>
        </div>
      </fieldset>
      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium">Certificates</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Organiser / club name" hint="Shown on emails and certificates"><input name="organizer_name" defaultValue={e?.organizer_name ?? ""} className="input" /></Field>
          <Field label="Certificate text" hint='e.g. "for participating in the hackathon"'><input name="certificate_text" defaultValue={e?.certificate_text ?? ""} className="input" /></Field>
        </div>
      </fieldset>
      <Msg state={state} />
      <button className="btn" disabled={pending}>{pending ? "Saving…" : event ? "Save changes" : "Create event"}</button>
    </form>
  );
}
