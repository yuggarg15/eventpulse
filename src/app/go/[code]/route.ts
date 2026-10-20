import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase";
import { attrCookie, ATTRIBUTION_DAYS } from "@/lib/attribution";
import { buildUtmUrl } from "@/lib/utils";

export async function GET(req: Request, { params }: RouteContext<"/go/[code]">) {
  const { code } = await params;
  const origin = new URL(req.url).origin;
  const fallback = NextResponse.redirect(new URL("/unavailable", origin));
  if (!/^[a-z0-9]{4,20}$/i.test(code)) return fallback;

  const db = admin();
  const { data: link } = await db.from("campaign_links").select("*, events(id,slug,status)").eq("code", code).maybeSingle();
  const ev = link?.events as { id: string; slug: string; status: string } | null;
  if (!link || link.status !== "active" || !ev || ev.status !== "published") return fallback;

  const { data: click } = await db.from("campaign_clicks").insert({ link_id: link.id, event_id: ev.id }).select("id").single();
  const dest = buildUtmUrl(`${origin}/e/${ev.slug}`, {
    utm_source: link.utm_source, utm_medium: link.utm_medium, utm_campaign: link.utm_campaign, utm_content: link.utm_content, utm_term: link.utm_term,
  });
  const res = NextResponse.redirect(dest);
  // The most recent tracked click for this event wins. Plain event URLs never overwrite it.
  if (click) res.cookies.set(attrCookie(ev.id), click.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: ATTRIBUTION_DAYS * 86400, secure: origin.startsWith("https") });
  return res;
}
