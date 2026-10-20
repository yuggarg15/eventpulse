"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, signup } from "@/app/actions";
import { Field, Msg } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  return (
    <form action={action} className="card w-full max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">{mode === "login" ? "Log in" : "Create your organiser account"}</h1>
      <Field label="Email"><input name="email" type="email" required className="input" /></Field>
      <Field label="Password" hint={mode === "signup" ? "At least 6 characters" : undefined}>
        <input name="password" type="password" required minLength={6} className="input" />
      </Field>
      <Msg state={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}</button>
      <p className="text-center text-sm text-slate-500">
        {mode === "login" ? <>New here? <Link className="text-indigo-600" href="/signup">Sign up</Link></> : <>Have an account? <Link className="text-indigo-600" href="/login">Log in</Link></>}
      </p>
    </form>
  );
}
