"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { admin, authClient, requireEvent, requireUser, type Question } from "@/lib/supabase";
import { deliver, runAutomations } from "@/lib/automations";
import { AUTOMATION_KINDS, type AutomationKind } from "@/lib/automation-defaults";
import { emailHtml, render, sendEmail } from "@/lib/email";
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

  let banner_url = p.data.banner_url || null;
  const file = f.get("banner");
  if (file instanceof File && file.size > 0) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return { error: "Banner must be a PNG, JPG or WebP image." };
    if (file.size > 3 * 1024 * 1024) return { error: "Banner must be under 3 MB." };
    const db0 = admin();
    await db0.storage.createBucket("banners", { public: true }); // no-op error if it already exists
    const path = `${user.id}/${Date.now()}.${file.type.split("/")[1]}`;
    const { error: upErr } = await db0.storage.from("banners").upload(path, file, { contentType: file.type });
    if (upErr) return { error: "Could not upload the banner. Try again or paste an image URL." };
    banner_url = db0.storage.from("banners").getPublicUrl(path).data.publicUrl;
  }
  const row = {
    ...p.data, banner_url, waitlist_enabled: f.get("waitlist_enabled") === "on",
    organizer_name: str(f, "organizer_name") || null, certificate_text: str(f, "certificate_text") || null, venue: p.data.venue || null, meeting_link: p.data.meeting_link || null,
    starts_at, ends_at, registration_closes_at: closes, capacity, ask_phone: f.get("ask_phone") === "on", custom_questions: questions,
  };
  const db = admin();
  let eventId = id;
  if (id) {
    await requireEvent(id);
    const { error } = await db.from("events").update(row).eq("id", id);
    if (error) return { error: error.code === "23505" ? "That slug is already taken." : "Could not save event." };
    await promoteAndNotify(id); // a higher capacity may free spots for the waitlist
  } else {
    const { data, error } = await db.from("events").insert({ ...row, owner_id: user.id }).select("id").single();
    if (error) return { error: error.code === "23505" ? "That slug is already taken." : "Could not save event." };
    eventId = data.id;
  }
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/events/${eventId}`);
}

export async function setEventStatus(eventId: string, status: string) {
  await requireEvent(eventId);
  if (!["draft", "published", "cancelled", "completed", "archived"].includes(status)) return;
  await admin().from("events").update({ status }).eq("id", eventId);
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
  if (str(f, "website")) return { ok: "Thanks!" }; // honeypot: real people never fill this hidden field
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
    p_ref_code: randomToken(4), p_referrer_code: /^[a-f0-9]{8}$/.test(str(f, "ref")) ? str(f, "ref") : null,
  });
  if (error) return { error: "Something went wrong. Please try again." };
  const msg: Record<string, string> = {
    closed: "Registration is closed for this event.", deadline: "The registration deadline has passed.",
    duplicate: "This email is already registered for this event.", full: "Sorry, this event is full.",
  };
  if (data?.error) return { error: msg[data.error] ?? "Could not register." };
  if (data.status === "confirmed") {
    await deliver(ev, "confirmation", { id: data.id, name: base.data.name, email: base.data.email, ticket_token: data.token, status: "confirmed" }, base.data.email, ev.organizer_name ?? "the organiser");
  }
  redirect(`/ticket/${data.token}`);
}

/* ---------- attendees ---------- */
export async function cancelRegistration(eventId: string, regId: string) {
  await requireEvent(eventId);
  await admin().from("event_registrations").update({ status: "cancelled" }).eq("id", regId).eq("event_id", eventId);
  await promoteAndNotify(eventId);
  revalidatePath(`/dashboard/events/${eventId}/registrations`);
}

// Moves waitlisted people up when spots are free (oldest first) and emails them.
async function promoteAndNotify(eventId: string) {
  const db = admin();
  const { data: ids } = await db.rpc("promote_waitlist", { p_event_id: eventId });
  if (!ids?.length) return;
  const { data: ev } = await db.from("events").select("*").eq("id", eventId).single();
  const { data: regs } = await db.from("event_registrations").select("id,name,email,ticket_token,status").in("id", ids);
  for (const r of regs ?? []) await deliver(ev, "waitlist_promoted", r, r.email, ev.organizer_name ?? "the organiser");
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
  const { user } = await requireEvent(eventId, true);
  const token = extractToken(scanned);
  if (!token) return { kind: "error", message: "That QR code is not an EventPulse ticket." };
  const { data } = await admin().from("event_registrations").select("id,name,event_id,status").eq("ticket_token", token).maybeSingle();
  return doCheckIn(eventId, user.id, data);
}

export async function checkInById(eventId: string, regId: string): Promise<CheckInResult> {
  const { user } = await requireEvent(eventId, true);
  const { data } = await admin().from("event_registrations").select("id,name,event_id,status").eq("id", regId).eq("event_id", eventId).maybeSingle();
  return doCheckIn(eventId, user.id, data);
}

/* ---------- automations & messaging ---------- */
export async function saveAutomation(eventId: string, kind: string, _: State, f: FormData): Promise<State> {
  await requireEvent(eventId);
  if (!AUTOMATION_KINDS.includes(kind as AutomationKind)) return { error: "Unknown automation." };
  const subject = str(f, "subject"), body = str(f, "body");
  if (!subject || !body) return { error: "Subject and message are required." };
  const offset = Math.max(0, Math.min(720, parseInt(str(f, "offset_hours") || "0", 10) || 0));
  await admin().from("event_automations").update({ subject: subject.slice(0, 200), body: body.slice(0, 3000), offset_hours: offset, enabled: f.get("enabled") === "on" }).eq("event_id", eventId).eq("kind", kind);
  revalidatePath(`/dashboard/events/${eventId}/automations`);
  return { ok: "Saved." };
}

export async function runNow(eventId: string): Promise<State> {
  await requireEvent(eventId);
  const r = await runAutomations(eventId);
  revalidatePath(`/dashboard/events/${eventId}/automations`);
  return { ok: `Run complete: ${r.sent} sent, ${r.failed} not delivered.` };
}

export async function sendBroadcast(eventId: string, _: State, f: FormData): Promise<State> {
  const { event } = await requireEvent(eventId);
  const subject = str(f, "subject"), body = str(f, "body"), who = str(f, "who");
  if (!subject || !body) return { error: "Subject and message are required." };
  const db = admin();
  const { data: regs } = await db.from("event_registrations").select("id,email,name").eq("event_id", eventId).eq("status", "confirmed");
  const { data: cis } = await db.from("event_check_ins").select("registration_id").eq("event_id", eventId);
  const checked = new Set((cis ?? []).map((c) => c.registration_id));
  const list = (regs ?? []).filter((r) => who === "all" || (who === "attended" ? checked.has(r.id) : !checked.has(r.id))).slice(0, 100);
  if (!list.length) return { error: "No attendees match that audience." };
  let sent = 0, failed = 0;
  for (const r of list) {
    const vars = { name: r.name, event: event.title };
    const subj = render(subject, vars);
    const res = await sendEmail(r.email, subj, emailHtml({ body: render(body, vars), footer: `You received this because you registered for ${event.title}.` }));
    await db.from("email_log").insert({ event_id: eventId, registration_id: null, kind: "broadcast", to_email: r.email, subject: subj, status: res.status, error: res.error ?? null });
    if (res.status === "sent") sent++; else failed++;
  }
  revalidatePath(`/dashboard/events/${eventId}/automations`);
  return failed && !sent ? { error: `No emails were delivered (${failed} failed). See the email log below.` } : { ok: `${sent} sent${failed ? `, ${failed} failed` : ""}.` };
}

/* ---------- feedback ---------- */
export async function submitFeedback(token: string, _: State, f: FormData): Promise<State> {
  const rating = parseInt(str(f, "rating"), 10);
  if (!(rating >= 1 && rating <= 5)) return { error: "Please choose a rating." };
  const db = admin();
  const { data: reg } = await db.from("event_registrations").select("id,event_id,status").eq("ticket_token", token).maybeSingle();
  if (!reg || reg.status !== "confirmed") return { error: "Invalid feedback link." };
  const { error } = await db.from("event_feedback").upsert({ event_id: reg.event_id, registration_id: reg.id, rating, comment: str(f, "comment").slice(0, 1000) || null }, { onConflict: "registration_id" });
  return error ? { error: "Could not save feedback." } : { ok: "Thank you for your feedback!" };
}

/* ---------- team ---------- */
export async function addMember(eventId: string, _: State, f: FormData): Promise<State> {
  const { event, role: myRole } = await requireEvent(eventId);
  if (myRole !== "owner") return { error: "Only the event owner can manage the team." };
  const email = str(f, "email").toLowerCase(), role = str(f, "role");
  if (!["organiser", "staff"].includes(role)) return { error: "Choose a role." };
  const { data } = await admin().auth.admin.listUsers({ page: 1, perPage: 1000 });
  const target = data.users.find((u) => u.email?.toLowerCase() === email);
  if (!target) return { error: "No EventPulse account with that email. Ask them to sign up first." };
  if (target.id === event.owner_id) return { error: "That's the owner." };
  const { error } = await admin().from("event_members").upsert({ event_id: eventId, user_id: target.id, role }, { onConflict: "event_id,user_id" });
  if (error) return { error: "Could not add member." };
  revalidatePath(`/dashboard/events/${eventId}/team`);
  return { ok: `${email} added as ${role}.` };
}

export async function removeMember(eventId: string, memberId: string) {
  const { role } = await requireEvent(eventId);
  if (role !== "owner") return;
  await admin().from("event_members").delete().eq("id", memberId).eq("event_id", eventId);
  revalidatePath(`/dashboard/events/${eventId}/team`);
}

/* ---------- misc ---------- */
export async function duplicateEvent(eventId: string) {
  const { event, user } = await requireEvent(eventId);
  const { id: _id, owner_id: _o, ...rest } = event;
  void _id; void _o;
  const { data } = await admin().from("events").insert({ ...rest, owner_id: user.id, title: `${event.title} (copy)`, slug: `${event.slug}-${randomCode(4)}`, status: "draft" }).select("id").single();
  if (data) redirect(`/dashboard/events/${data.id}/edit`);
}

export async function saveProfile(_: State, f: FormData): Promise<State> {
  const user = await requireUser();
  const display_name = str(f, "display_name").slice(0, 80);
  const { error } = await admin().auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, display_name } });
  return error ? { error: "Could not save." } : { ok: "Profile saved." };
}
