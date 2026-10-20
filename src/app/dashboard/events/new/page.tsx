import Link from "next/link";
import { EventForm } from "@/components/event-form";
import { EVENT_TEMPLATES } from "@/lib/templates";

export default async function NewEvent({ searchParams }: PageProps<"/dashboard/events/new">) {
  const t = String((await searchParams).template ?? "");
  const tpl = EVENT_TEMPLATES[t];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Create event</h1>
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Start from a template</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Link href="/dashboard/events/new" className={`card !p-3 text-sm ${!tpl ? "ring-2 ring-indigo-500" : ""}`}><b>Blank</b><br /><span className="text-xs text-slate-500">Start from scratch</span></Link>
          {Object.entries(EVENT_TEMPLATES).map(([k, v]) => (
            <Link key={k} href={`/dashboard/events/new?template=${k}`} className={`card !p-3 text-sm ${t === k ? "ring-2 ring-indigo-500" : ""}`}><b>{v.label}</b><br /><span className="text-xs text-slate-500">{v.blurb}</span></Link>
          ))}
        </div>
      </div>
      <EventForm key={t} prefill={tpl?.values} />
    </div>
  );
}
