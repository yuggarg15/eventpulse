import Link from "next/link";
export default function Page() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-xl font-semibold">This link is no longer available</h1>
      <p className="text-slate-500">The event may have ended, been unpublished, or the link was turned off.</p>
      <Link href="/" className="btn-ghost">Go to EventPulse</Link>
    </main>
  );
}
