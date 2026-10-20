import Link from "next/link";
import { Activity, LogOut } from "lucide-react";
import { logout } from "@/app/actions";
import { requireUser } from "@/lib/supabase";
import { NavLinks } from "@/components/nav-links";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const name = (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "You";
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 p-3 md:sticky md:top-0 md:h-screen md:flex-col md:items-stretch md:justify-start md:gap-6 md:p-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white"><Activity size={18} /></span>
            <span className="hidden sm:inline">EventPulse</span>
          </Link>
          <NavLinks />
          <div className="md:mt-auto">
            <div className="mb-2 hidden items-center gap-2 md:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">{name[0]?.toUpperCase()}</span>
              <div className="min-w-0"><p className="truncate text-sm font-medium">{name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div>
            </div>
            <form action={logout}><button className="btn-ghost w-full"><LogOut size={14} /> <span className="hidden sm:inline">Log out</span></button></form>
          </div>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
