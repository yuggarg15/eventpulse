import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Server-only client with full access. Never import this from a client component.
export const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

// Client tied to the logged-in user's cookies.
export async function authClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}

// cache(): the login check runs once per request, however many layouts/pages ask for it.
export const getUser = cache(async () => {
  const { data } = await (await authClient()).auth.getUser();
  return data.user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export type Role = "owner" | "organiser" | "staff";

// Returns the event only if the signed-in user owns it or is a team member.
// Staff can only reach pages that pass allowStaff (check-in); everyone else is sent there.
export const requireEvent = cache(async (eventId: string, allowStaff = false) => {
  const user = await requireUser();
  const db = admin();
  if (!/^[0-9a-f-]{36}$/.test(eventId)) redirect("/dashboard");
  const { data } = await db.from("events").select("*").eq("id", eventId).maybeSingle();
  let role: Role | null = null;
  if (data?.owner_id === user.id) role = "owner";
  else if (data) {
    const { data: m } = await db.from("event_members").select("role").eq("event_id", eventId).eq("user_id", user.id).maybeSingle();
    role = (m?.role as Role) ?? null;
  }
  if (!data || !role) redirect("/dashboard");
  if (role === "staff" && !allowStaff) redirect(`/dashboard/events/${eventId}/check-in`);
  return { user, event: data as EventRow, role };
});

export type EventRow = {
  id: string; owner_id: string; slug: string; title: string; description: string; category: string;
  banner_url: string | null; format: "in_person" | "online" | "hybrid"; venue: string | null;
  meeting_link: string | null; starts_at: string; ends_at: string; registration_closes_at: string | null;
  capacity: number | null; ask_phone: boolean; waitlist_enabled: boolean; organizer_name: string | null; certificate_text: string | null; custom_questions: Question[]; status: string;
};
export type Question = { id: string; label: string; type: "text" | "choice"; options?: string[]; required?: boolean };
