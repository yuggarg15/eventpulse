import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
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

export async function getUser() {
  const { data } = await (await authClient()).auth.getUser();
  return data.user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

// Returns the event only if it belongs to the signed-in user.
export async function requireEvent(eventId: string) {
  const user = await requireUser();
  const { data } = await admin().from("events").select("*").eq("id", eventId).eq("owner_id", user.id).maybeSingle();
  if (!data) redirect("/dashboard");
  return { user, event: data as EventRow };
}

export type EventRow = {
  id: string; owner_id: string; slug: string; title: string; description: string; category: string;
  banner_url: string | null; format: "in_person" | "online" | "hybrid"; venue: string | null;
  meeting_link: string | null; starts_at: string; ends_at: string; registration_closes_at: string | null;
  capacity: number | null; ask_phone: boolean; custom_questions: Question[]; status: string;
};
export type Question = { id: string; label: string; type: "text" | "choice"; options?: string[]; required?: boolean };
