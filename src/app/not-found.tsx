import Link from "next/link";
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link href="/" className="btn-ghost">Go home</Link>
    </main>
  );
}
