"use client";
import { useActionState, useState } from "react";
import { submitFeedback } from "@/app/actions";
import { Msg } from "./ui";

export function FeedbackForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(submitFeedback.bind(null, token), undefined);
  const [rating, setRating] = useState(0);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="rating" value={rating} />
      <div className="flex justify-center gap-1">{[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} onClick={() => setRating(n)} className={`text-4xl ${n <= rating ? "text-amber-400" : "text-slate-300"}`} aria-label={`${n} stars`}>★</button>
      ))}</div>
      <textarea name="comment" rows={3} placeholder="Anything we could do better? (optional)" className="input" />
      <Msg state={state} />
      <button className="btn w-full" disabled={pending || !rating}>{pending ? "Sending…" : "Submit feedback"}</button>
    </form>
  );
}
