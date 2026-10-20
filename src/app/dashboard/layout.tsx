import Link from "next/link";
import { LayoutDashboard, CalendarDays, LogOut } from "lucide-react";
import { logout } from "@/app/actions";
import { requireUser } from "@/lib/supabase";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/events", label: "My Events", icon: CalendarDays },
  ];
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:w-56 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-4 p-3 md:flex-col md:items-stretch md:p-4">
          <Link href="/dashboard" className="text-lg font-bold text-indigo-600">EventPulse</Link>
          <nav className="flex gap-1 md:flex-col">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                <n.icon size={16} /> {n.label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="md:mt-6">
            <p className="mb-2 hidden truncate text-xs text-slate-500 md:block">{user.email}</p>
            <button className="btn-ghost w-full"><LogOut size={14} /> <span className="hidden sm:inline">Log out</span></button>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
