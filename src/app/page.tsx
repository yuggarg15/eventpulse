import Link from "next/link";
import { getUser } from "@/lib/supabase";

export default async function Home() {
  const user = await getUser();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">EventPulse</h1>
      <p className="text-lg text-slate-600">
        Create an event, share tracked links for each channel, collect registrations, and check people in with QR tickets.
      </p>
      <div className="flex justify-center gap-3">
        {user ? <Link href="/dashboard" className="btn">Open dashboard</Link> : (
          <>
            <Link href="/signup" className="btn">Get started</Link>
            <Link href="/login" className="btn-ghost">Log in</Link>
          </>
        )}
      </div>
    </main>
  );
}
