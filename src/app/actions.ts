"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { admin, authClient, requireEvent, requireUser, type Question } from "@/lib/supabase";
import { attrCookie, clickIsAttributable } from "@/lib/attribution";
import { extractToken } from "@/lib/ticket";
import { istToIso, normalizeUtm, randomCode, randomToken, slugify } from "@/lib/utils";

export type State = { error?: string; ok?: string } | undefined;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/* ---------- auth ---------- */
export async function signup(_: State, f: FormData): Promise<State> {
  const email = str(f, "email").toLowerCase(), password = str(f, "password");
  if (!z.email().safeParse(email).success) return { error: "Enter a valid email." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  // Created pre-confirmed so no email click is needed.
  const { error } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) return { error: /already|registered/i.test(error.message) ? "That email already has an account. Log in instead." : "Could not create account." };
  const { error: e2 } = await (await authClient()).auth.signInWithPassword({ email, password });
  if (e2) return { error: "Account created, but login failed. Try logging in." };
  redirect("/dashboard");
}

export async function login(_: State, f: FormData): Promise<State> {
  const { error } = await (await authClient()).auth.signInWithPassword({ email: str(f, "email"), password: str(f, "password") });
  if (error) return { error: "Wrong email or password." };
  redirect("/dashboard");
}

export async function logout() {
  await (await authClient()).auth.signOut();
  redirect("/");
}

/* ---------- events ---------- */
const eventSchema = z.object({
  title: z.string().min(3, "Title is too short"),
  slug: z.string().min(3, "Slug is too short").regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers and dashes only"),
  description: z.string(),
  category: z.string().min(1),
  banner_url: z.string().url().optional().or(z.literal("")),
  format: z.enum(["in_person", "online", "hybrid"]),
  venue: z.string(),
  meeting_link: z.string(),
});

export async function saveEvent(_: State, f: FormData): Promise<State> {
  const user = await requireUser();
  const id = str(f, "id");
  const p = eventSchema.safeParse({
    title: str(f, "title"), slug: slugify(str(f, "slug") || str(f, "title")), description: str(f, "description"),
    category: str(f, "category") || "General", banner_url: str(f, "banner_url"), format: str(f, "format"),
    venue: str(f, "venue"), meeting_link: str(f, "meeting_link"),
  });
  if (!p.success) return { error: p.error.issues[0].message };
  if (!str(f, "starts_at") || !str(f, "ends_at")) return { error: "Start and end time are required." };
  const starts_at = istToIso(str(f, "starts_at")), ends_at = istToIso(str(f, "ends_at"));
  if (new Date(ends_at) <= new Date(starts_at)) return { error: "End time must be after start time." };
  const closes = str(f, "registration_closes_at") ? istToIso(str(f, "registration_closes_at")) : null;
  if (closes && new Date(closes) > new Date(ends_at)) return { error: "Registration must close before the event ends." };
  const capacity = str(f, "capacity") ? parseInt(str(f, "capacity"), 10) : null;
  if (capacity !== null && !(capacity > 0)) return { error: "Capacity must be a positive number." };

  // Optional custom question: one short-text and one single-choice question
  const questions: Question[] = [];
  const q1 = str(f, "q1_label");
  if (q1) questions.push({ id: "q1", label: q1, type: "text", required: f.get("q1_required") === "on" });
  const q2 = str(f, "q2_label");
  const opts = str(f, "q2_options").split(",").map((s) => s.trim()).filter(Boolean);
  if (q2) {
    if (opts.length < 2) return { error: "Choice question needs at least 2 comma-separated options." };
    questions.push({ id: "q2", label: q2, type: "choice", options: opts, required: f.get("q2_required") === "on" });
  }

  const row = {
    ...p.data, banner_url: p.data.banner_url || null, venue: p.data.venue || null, meeting_link: p.data.meeting_link || null,
    starts_at, ends_at, registration_closes_at: closes, capacity, ask_phone: f.get("ask_phone") === "on", custom_questions: questions,
  };
  const db = admin();
  let eventId = id;
  if (id) {
    await requireEvent(id);
    const { error } = await db.from("events").update(row).eq("id", id).eq("owner_id", user.id);
    if (error) return { error: error.code === "23505" ? "That slug is already taken." : "Could not save event." };
  } else {
    const { data, error } = await db.from("events").insert({ ...row, owner_id: user.id }).select("id").single();
    if (error) return { error: error.code === "23505" ? "That slug is already taken." : "Could not save event." };
    eventId = data.id;
  }
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/events/${eventId}`);
}

export async function setEventStatus(eventId: string, status: string) {
  const { user } = await requireEvent(eventId);
  if (!["draft", "published", "cancelled", "completed", "archived"].includes(status)) return;
  await admin().from("events").update({ status }).eq("id", eventId).eq("owner_id", user.id);
  revalidatePath("/dashboard", "layout");
}

/* ---------- campaigns ---------- */
export async function saveCampaign(eventId: string, _: State, f: FormData): Promise<State> {
  await requireEvent(eventId);
  const id = str(f, "id");
  const name = str(f, "name");
  const source = normalizeUtm(str(f, "utm_source")), medium = normalizeUtm(str(f, "utm_medium")), campaign = normalizeUtm(str(f, "utm_campaign"));
  if (!name || !source || !medium || !campaign) return { error: "Name, source, medium and campaign are required." };
  const row = {
    name, channel: str(f, "channel") || "Other", description: str(f, "description") || null,
    utm_source: source, utm_medium: medium, utm_campaign: campaign,
    utm_content: normalizeUtm(str(f, "utm_content")) || null, utm_term: normalizeUtm(str(f, "utm_term")) || null,
  };
  const db = admin();
  if (id) {
    // event_id is part of the match, so a link can never be moved to or edited via another event.
    const { error } = await db.from("campaign_links").update(row).eq("id", id).eq("event_id", eventId);
    if (error) return { error: "Could not update link." };
  } else {
    const { error } = await db.from("campaign_links").insert({ ...row, event_id: eventId, code: randomCode() });
    if (error) return { error: "Could not create link." };
  }
  revalidatePath(`/dashboard/events/${eventId}/campaigns`);
  return { ok: id ? "Link updated." : "Link created." };
}

export async function setCampaignStatus(eventId: string, linkId: string, status: "active" | "inactive" | "archived") {
  await requireEvent(eventId);
  await admin().from("campaign_links").update({ status }).eq("id", linkId).eq("event_id", eventId);
  revalidatePath(`/dashboard/events/${eventId}/campaigns`);
}

/* ---------- public registration ---------- */
export async function register(slug: string, _: State, f: FormData): Promise<State> {
  const db = admin();
  const { data: ev } = await db.from("events").select("*").eq("slug", slug).maybeSingle();
  if (!ev || ev.status !== "published") return { error: "This event is not open for registration." };

  const base = z.object({ name: z.string().min(2, "Enter your name"), email: z.email("Enter a valid email") })
    .safeParse({ name: str(f, "name"), email: str(f, "email") });
  if (!base.success) return { error: base.error.issues[0].message };
  const phone = str(f, "phone");
  if (ev.ask_phone && !/^[0-9+\-\s]{7,15}$/.test(phone)) return { error: "Enter a valid phone number." };

  const answers: Record<string, string> = {};
  for (const q of (ev.custom_questions ?? []) as Question[]) {
    const v = str(f, `answer_${q.id}`);
    if (q.required && !v) return { error: `Please answer: ${q.label}` };
    if (q.type === "choice" && v && !q.options?.includes(v)) return { error: `Invalid answer for: ${q.label}` };
    if (v) answers[q.label] = v.slice(0, 300);
  }

  // Attribution: cookie holds a click id; the server verifies it belongs to this event and is recent.
  let click_id: string | null = null, link_id: string | null = null;
  let utm: { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null } =
    { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null };
  const cid = (await cookies()).get(attrCookie(ev.id))?.value;
  if (cid && /^[0-9a-f-]{36}$/.test(cid)) {
    const { data: click } = await db.from("campaign_clicks").select("id,event_id,created_at,link_id").eq("id", cid).maybeSingle();
    if (clickIsAttributable(click, ev.id)) {
      const { data: link } = await db.from("campaign_links").select("*").eq("id", click!.link_id).eq("event_id", ev.id).maybeSingle();
      if (link) {
        click_id = click!.id; link_id = link.id;
        utm = { utm_source: link.utm_source, utm_medium: link.utm_medium, utm_campaign: link.utm_campaign, utm_content: link.utm_content };
      }
    }
  }

  const { data, error } = await db.rpc("register_attendee", {
    p_event_id: ev.id, p_name: base.data.name, p_email: base.data.email, p_phone: phone || null, p_answers: answers,
    p_token: randomToken(), p_link_id: link_id, p_click_id: click_id,
    p_utm_source: utm.utm_source, p_utm_medium: utm.utm_medium, p_utm_campaign: utm.utm_campaign, p_utm_content: utm.utm_content,
  });
  if (error) return { error: "Something went wrong. Please try again." };
  const msg: Record<string, string> = {
    closed: "Registration is closed for this event.", deadline: "The registration deadline has passed.",
    duplicate: "This email is already registered for this event.", full: "Sorry, this event is full.",
  };
  if (data?.error) return { error: msg[data.error] ?? "Could not register." };
  redirect(`/ticket/${data.token}`);
}

/* ---------- attendees ---------- */
export async function cancelRegistration(eventId: string, regId: string) {
  await requireEvent(eventId);
  await admin().from("event_registrations").update({ status: "cancelled" }).eq("id", regId).eq("event_id", eventId);
  revalidatePath(`/dashboard/events/${eventId}/registrations`);
}

/* ---------- check-in ---------- */
export type CheckInResult = { kind: "success" | "duplicate" | "error"; message: string; name?: string };

async function doCheckIn(eventId: string, userId: string, reg: { id: string; name: string; event_id: string; status: string } | null): Promise<CheckInResult> {
  if (!reg) return { kind: "error", message: "Invalid ticket. No attendee found." };
  if (reg.event_id !== eventId) return { kind: "error", message: "This ticket is for a different event." };
  if (reg.status !== "confirmed") return { kind: "error", message: "This registration was cancelled.", name: reg.name };
  const { error } = await admin().from("event_check_ins").insert({ registration_id: reg.id, event_id: eventId, checked_in_by: userId });
  if (error?.code === "23505") {
    const { data } = await admin().from("event_check_ins").select("created_at").eq("registration_id", reg.id).maybeSingle();
    const when = data ? new Date(data.created_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) : "earlier";
    return { kind: "duplicate", message: `Already checked in at ${when}.`, name: reg.name };
  }
  if (error) return { kind: "error", message: "Could not check in. Try again." };
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  return { kind: "success", message: "Checked in!", name: reg.name };
}

export async function checkInByScan(eventId: string, scanned: string): Promise<CheckInResult> {
  const { user } = await requireEvent(eventId);
  const token = extractToken(scanned);
  if (!token) return { kind: "error", message: "That QR code is not an EventPulse ticket." };
  const { data } = await admin().from("event_registrations").select("id,name,event_id,status").eq("ticket_token", token).maybeSingle();
  return doCheckIn(eventId, user.id, data);
}

export async function checkInById(eventId: string, regId: string): Promise<CheckInResult> {
  const { user } = await requireEvent(eventId);
  const { data } = await admin().from("event_registrations").select("id,name,event_id,status").eq("id", regId).eq("event_id", eventId).maybeSingle();
  return doCheckIn(eventId, user.id, data);
}
