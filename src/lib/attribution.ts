export const ATTRIBUTION_DAYS = 7;
export const attrCookie = (eventId: string) => `ep_attr_${eventId}`;

// A click is valid for attribution if it belongs to this event and is within the window.
export function clickIsAttributable(click: { event_id: string; created_at: string } | null, eventId: string, now = Date.now()) {
  if (!click || click.event_id !== eventId) return false;
  return now - new Date(click.created_at).getTime() <= ATTRIBUTION_DAYS * 86400e3;
}
