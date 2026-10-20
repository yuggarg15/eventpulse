import { requireEvent } from "@/lib/supabase";
import { loadEventStats } from "@/lib/stats";
import { appUrl, buildUtmUrl, trackingUrl } from "@/lib/utils";
import { CampaignManager } from "@/components/campaign-manager";

export default async function Campaigns({ params }: PageProps<"/dashboard/events/[eventId]/campaigns">) {
  const { eventId } = await params;
  const { event } = await requireEvent(eventId);
  const { links, summary } = await loadEventStats(eventId);
  const rows = links.map((l) => {
    const s = summary.rows.find((r) => r.id === l.id)!;
    return {
      ...l, trackUrl: trackingUrl(l.code),
      destUrl: buildUtmUrl(`${appUrl()}/e/${event.slug}`, { utm_source: l.utm_source, utm_medium: l.utm_medium, utm_campaign: l.utm_campaign, utm_content: l.utm_content, utm_term: l.utm_term }),
      clicks: s.clicks, visits: s.visits, registrations: s.registrations, checkins: s.checkins, conversion: s.conversion,
    };
  });
  return <CampaignManager eventId={eventId} slug={event.slug} rows={rows} />;
}
