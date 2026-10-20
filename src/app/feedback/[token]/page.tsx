import { notFound } from "next/navigation";
import { admin } from "@/lib/supabase";
import { FeedbackForm } from "@/components/feedback-form";

export default async function FeedbackPage({ params }: PageProps<"/feedback/[token]">) {
  const { token } = await params;
  if (!/^[a-f0-9]{20,64}$/.test(token)) notFound();
  const { data: reg } = await admin().from("event_registrations").select("name,status, events(title)").eq("ticket_token", token).maybeSingle();
  if (!reg || reg.status !== "confirmed") notFound();
  const title = (reg.events as unknown as { title: string }).title;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center p-4">
      <div className="card w-full space-y-4 text-center">
        <h1 className="text-xl font-bold">How was {title}?</h1>
        <p className="text-sm text-slate-500">Hi {reg.name}, your feedback helps the organisers.</p>
        <FeedbackForm token={token} />
      </div>
    </main>
  );
}
