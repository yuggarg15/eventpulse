"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Settings, Users } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/events", label: "My Events", icon: CalendarDays },
  { href: "/dashboard/audience", label: "Audience", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 md:flex-col">
      {items.map((n) => {
        const active = n.exact ? path === n.href : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
            <n.icon size={16} /> <span className="hidden sm:inline">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
