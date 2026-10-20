"use client";
import { useActionState } from "react";
import { register } from "@/app/actions";
import type { Question } from "@/lib/supabase";
import { Field, Msg } from "./ui";

export function RegisterForm({ slug, askPhone, questions }: { slug: string; askPhone: boolean; questions: Question[] }) {
  const [state, action, pending] = useActionState(register.bind(null, slug), undefined);
  return (
    <form action={action} className="card space-y-3">
      <h2 className="text-lg font-semibold">Register</h2>
      <Field label="Full name"><input name="name" required className="input" /></Field>
      <Field label="Email"><input name="email" type="email" required className="input" /></Field>
      {askPhone && <Field label="Phone number"><input name="phone" type="tel" required className="input" /></Field>}
      {questions.map((q) => (
        <Field key={q.id} label={q.label + (q.required ? " *" : "")}>
          {q.type === "choice" ? (
            <select name={`answer_${q.id}`} required={q.required} className="input" defaultValue=""><option value="">Select…</option>{q.options?.map((o) => <option key={o}>{o}</option>)}</select>
          ) : <input name={`answer_${q.id}`} required={q.required} className="input" />}
        </Field>
      ))}
      <Msg state={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Registering…" : "Register"}</button>
    </form>
  );
}
