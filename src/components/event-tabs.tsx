"use client";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const ALL = [
  ["Overview", ""], ["Campaigns", "/campaigns"], ["Registrations", "/registrations"], ["Check-in", "/check-in"],
  ["Automations", "/automations"], ["Analytics", "/analytics"], ["Feedback", "/feedback"], ["Team", "/team"], ["Edit", "/edit"],
];

export function EventTabs({ role }: { role: string }) {
  const { eventId } = useParams<{ eventId: string }>();
  const path = usePathname();
  const base = `/dashboard/events/${eventId}`;
  const tabs = role === "staff" ? ALL.filter(([l]) => l === "Check-in") : ALL;
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
      {tabs.map(([label, suffix]) => {
        const href = base + suffix, active = path === href;
        return (
          <Link key={label} href={href} className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium ${active ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-600 hover:text-slate-900"}`}>{label}</Link>
        );
      })}
    </nav>
  );
}
