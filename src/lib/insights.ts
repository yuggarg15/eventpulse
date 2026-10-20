import { fmtPct } from "./utils";
import type { Summary } from "./stats";

export const DEFAULT_SHOW_RATE = 0.7;

// Share of confirmed registrants who actually attended in the organiser's past events.
// Needs at least 10 registrations in total to be trusted; otherwise falls back to a default.
export function showRate(past: { confirmed: number; checked: number }[]) {
  const c = past.reduce((s, e) => s + e.confirmed, 0), k = past.reduce((s, e) => s + e.checked, 0);
  return c >= 10 ? { rate: k / c, basedOnHistory: true } : { rate: DEFAULT_SHOW_RATE, basedOnHistory: false };
}

export const forecastTurnout = (confirmed: number, rate: number) => Math.round(confirmed * rate);

// Plain-English observations derived from the numbers. Pure and deterministic.
export function buildInsights(s: Summary, ctx: { capacity: number | null; daysToStart: number | null; avgRating: number | null; feedbackCount: number }) {
  const out: { tone: "good" | "warn" | "info"; text: string }[] = [];
  const tracked = s.rows.filter((r) => r.clicks > 0);

  if (s.confirmed === 0 && s.clicks === 0) {
    out.push({ tone: "info", text: "No data yet. Create a tracked link for each place you promote and share it. Insights appear after the first clicks." });
    return out;
  }
  if (tracked.length >= 2) {
    const byVol = [...tracked].sort((a, b) => b.clicks - a.clicks)[0];
    const byConv = [...tracked].filter((r) => r.clicks >= 5 && r.conversion !== null).sort((a, b) => b.conversion! - a.conversion!)[0];
    if (byConv && byConv.id !== byVol.id) {
      out.push({ tone: "info", text: `${byVol.name} brings the most clicks (${byVol.clicks}), but ${byConv.name} converts best (${fmtPct(byConv.conversion)}). Consider shifting effort toward ${byConv.channel}.` });
    } else if (byConv) {
      out.push({ tone: "good", text: `${byConv.name} is both your biggest and best-converting link (${fmtPct(byConv.conversion)}).` });
    }
    const dead = tracked.filter((r) => r.clicks >= 10 && r.registrations === 0);
    for (const d of dead.slice(0, 2)) out.push({ tone: "warn", text: `${d.name} has ${d.clicks} clicks but no registrations. The message or audience may not match the event.` });
  }
  if (s.confirmed >= 5 && s.direct / s.confirmed > 0.6) out.push({ tone: "info", text: `${Math.round((s.direct / s.confirmed) * 100)}% of registrations have no tracked source. Share tracked links instead of the plain event URL to see what works.` });
  if (s.clicks >= 10 && s.visits > 0 && s.visits / s.clicks < 0.6) out.push({ tone: "warn", text: "Fewer than 60% of clicks end in a loaded event page. Check that the event is published and loads fast on mobile." });
  if (ctx.capacity && ctx.daysToStart !== null && ctx.daysToStart > 0) {
    const fill = s.confirmed / ctx.capacity;
    if (fill >= 1) out.push({ tone: "good", text: "The event is full." });
    else if (ctx.daysToStart <= 7 && fill < 0.5) out.push({ tone: "warn", text: `Only ${Math.round(fill * 100)}% full with ${Math.ceil(ctx.daysToStart)} days left. Push your best-converting channel now.` });
  }
  if (s.attendance !== null && s.confirmed >= 5) {
    out.push({ tone: s.attendance >= 70 ? "good" : "warn", text: `${s.attendance}% of registered people attended${s.attendance < 70 ? ". A reminder email 24h before usually helps (it is one of your automations)." : "."}` });
  }
  if (ctx.avgRating !== null && ctx.feedbackCount >= 3) out.push({ tone: ctx.avgRating >= 4 ? "good" : "warn", text: `Attendees rate this event ${ctx.avgRating.toFixed(1)}/5 across ${ctx.feedbackCount} responses.` });
  if (!out.length) out.push({ tone: "info", text: "Keep promoting. More data is needed for useful insights." });
  return out;
}
