import { describe, expect, it } from "vitest";
import { buildUtmUrl, normalizeUtm, pct, fmtPct, slugify } from "../src/lib/utils";
import { clickIsAttributable } from "../src/lib/attribution";
import { extractToken } from "../src/lib/ticket";
import { summarize } from "../src/lib/stats";

describe("UTM", () => {
  it("encodes values and omits empty ones", () => {
    const u = buildUtmUrl("https://x.com/e/a", { utm_source: "insta gram", utm_medium: "social", utm_content: "", utm_term: null, utm_campaign: "a&b" });
    expect(u).toBe("https://x.com/e/a?utm_source=insta+gram&utm_medium=social&utm_campaign=a%26b");
  });
  it("normalizes names", () => expect(normalizeUtm("  Story Main ")).toBe("story_main"));
  it("slugifies", () => expect(slugify("Tech Hackathon 2026!")).toBe("tech-hackathon-2026"));
});

describe("attribution window", () => {
  const now = Date.now();
  const click = (days: number, ev = "e1") => ({ event_id: ev, created_at: new Date(now - days * 86400e3).toISOString() });
  it("accepts a recent click for the same event", () => expect(clickIsAttributable(click(2), "e1", now)).toBe(true));
  it("rejects expired clicks", () => expect(clickIsAttributable(click(8), "e1", now)).toBe(false));
  it("rejects clicks from another event", () => expect(clickIsAttributable(click(1, "e2"), "e1", now)).toBe(false));
  it("rejects missing click", () => expect(clickIsAttributable(null, "e1", now)).toBe(false));
});

describe("ticket token", () => {
  const t = "a".repeat(36);
  it("reads a raw token", () => expect(extractToken(t)).toBe(t));
  it("reads a ticket URL", () => expect(extractToken(`https://x.com/ticket/${t}`)).toBe(t));
  it("rejects junk", () => expect(extractToken("hello world")).toBeNull());
  it("rejects emails", () => expect(extractToken("a@b.com")).toBeNull());
});

describe("analytics", () => {
  it("handles zero denominators", () => {
    expect(pct(3, 0)).toBeNull();
    expect(fmtPct(null)).toBe("—");
    const s = summarize([], [], [], [], []);
    expect(s.clickToReg).toBeNull();
    expect(s.attendance).toBeNull();
  });
  it("attributes registrations per link and counts direct separately", () => {
    const links = [{ id: "l1", name: "IG", channel: "Instagram" }, { id: "l2", name: "WA", channel: "WhatsApp" }];
    const d = "2026-01-01T10:00:00Z";
    const clicks = [1, 2, 3, 4].map((i) => ({ id: `c${i}`, link_id: i <= 3 ? "l1" : "l2", created_at: d }));
    const regs = [
      { id: "r1", status: "confirmed", link_id: "l1", created_at: d },
      { id: "r2", status: "confirmed", link_id: "l2", created_at: d },
      { id: "r3", status: "confirmed", link_id: null, created_at: d },
      { id: "r4", status: "cancelled", link_id: "l1", created_at: d },
    ];
    const s = summarize(links, clicks, [{ click_id: "c1", created_at: d }], regs, [{ registration_id: "r1", created_at: d }]);
    expect(s.confirmed).toBe(3);
    expect(s.direct).toBe(1);
    expect(s.rows[0]).toMatchObject({ clicks: 3, registrations: 1, visits: 1, checkins: 1 });
    expect(s.attendance).toBeCloseTo(33.3, 1);
    expect(s.byChannel.find((c) => c.channel === "Direct / unknown")?.registrations).toBe(1);
  });
});

import { buildInsights, forecastTurnout, showRate } from "../src/lib/insights";
import { render, emailHtml } from "../src/lib/email";

describe("forecast", () => {
  it("uses history when enough data", () => expect(showRate([{ confirmed: 20, checked: 10 }]).rate).toBe(0.5));
  it("falls back to default with little data", () => {
    const r = showRate([{ confirmed: 4, checked: 4 }]);
    expect(r.basedOnHistory).toBe(false);
    expect(forecastTurnout(10, r.rate)).toBe(7);
  });
});

describe("insights", () => {
  const ctx = { capacity: 100, daysToStart: 3, avgRating: null, feedbackCount: 0 };
  it("handles empty events", () => expect(buildInsights(summarize([], [], [], [], []), ctx)[0].tone).toBe("info"));
  it("contrasts volume with conversion", () => {
    const d = "2026-01-01T10:00:00Z";
    const links = [{ id: "a", name: "WA", channel: "WhatsApp" }, { id: "b", name: "IG", channel: "Instagram" }];
    const clicks = [...Array(20)].map((_, i) => ({ id: `a${i}`, link_id: "a", created_at: d })).concat([...Array(10)].map((_, i) => ({ id: `b${i}`, link_id: "b", created_at: d })));
    const regs = [...Array(2)].map((_, i) => ({ id: `ra${i}`, status: "confirmed", link_id: "a", created_at: d })).concat([...Array(5)].map((_, i) => ({ id: `rb${i}`, status: "confirmed", link_id: "b", created_at: d })));
    const text = buildInsights(summarize(links, clicks, [], regs, []), ctx).map((i) => i.text).join(" ");
    expect(text).toContain("WA brings the most clicks");
    expect(text).toContain("IG converts best");
  });
});

describe("email templates", () => {
  it("fills variables and blanks unknown ones", () => expect(render("Hi {{name}}{{nope}}!", { name: "Sam" })).toBe("Hi Sam!"));
  it("escapes HTML in the body", () => expect(emailHtml({ body: "<script>x</script>" })).not.toContain("<script>x"));
});
