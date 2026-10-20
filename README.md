# EventPulse

**Event growth platform for clubs and communities.** Create an event, promote it through tracked links (one per channel), collect registrations, check people in with QR tickets, and let automations handle the follow-up. All of it measured, so you know which promotion actually worked.

Stack: Next.js 16 (App Router, server actions), TypeScript, Tailwind, Supabase (Postgres + Auth + Storage), Resend, Recharts. Deployed on Netlify.

## Features
- **Events**: templates, banner upload, waitlist, custom registration questions, duplicate, publish / cancel / archive.
- **Campaigns**: tracked link + downloadable QR per channel, UTM tagging, 7-day last-click attribution.
- **Registration**: concurrency-safe capacity, duplicate prevention, waitlist with auto-promotion, per-attendee referral links.
- **Tickets & check-in**: private QR ticket, camera scanner with manual fallback, duplicate-scan detection, offline scan queue, live count.
- **Automations**: confirmation, reminder, feedback, certificate, no-show, waitlist-promotion and low-sign-up emails, editable, with a delivery log.
- **Analytics**: funnel, channel/campaign performance, trend, plain-English insights, turnout forecast, printable report.
- **Teams**: owner / organiser / door-staff roles. **Audience**: repeat attendees across events.

See [PRODUCT.md](PRODUCT.md) for the product thinking and [Technical decisions](#technical-decisions).

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in (Supabase URL + keys; optional Resend key).
3. In Supabase → SQL Editor, run `supabase/schema.sql`, then `supabase/migration-2.sql`.
4. `npm run dev` → http://localhost:3000, then sign up (no email confirmation needed).
5. Optional demo data: `node --env-file=.env.local scripts/seed.mjs` creates `demo@eventpulse.demo` with clearly labelled **fake** `[DEMO]` events. Remove it with `--reset`. Never run it against real production analytics you care about.

## Try the main flows
- **Tracking**: create + publish an event → Campaigns → New link → open the copied link in a private window → register → the registration shows the channel in Registrations and Analytics. A plain event URL registration is "Direct".
- **Check-in**: open the ticket page, then Check-in → Start scanning (or paste the ticket link). Scanning twice reports "already checked in".
- **Automations**: Automations tab → Run now. Reminders / feedback / certificates fire based on event times.

## Email (Resend)
Set `RESEND_API_KEY` (and `EMAIL_FROM`). With Resend's default test sender (`onboarding@resend.dev`) emails can only be delivered to your own Resend account address; verify a domain at resend.com/domains to email anyone. Failures are logged, never silently dropped, and the ticket page only claims an email was sent if it was.

## Deploy (Netlify)
Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (your site URL, no trailing slash), `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET` (any long random string). `netlify/functions/cron.mts` runs the automation engine hourly by calling `/api/cron/run`.

## Technical decisions
- **No overbooking**: registration is one Postgres function that locks the event row (`FOR UPDATE`), so simultaneous requests can't exceed capacity; the `(event_id, email_norm)` unique constraint prevents duplicates.
- **Attribution**: `/go/<code>` records a click and sets an httpOnly per-event cookie (7 days). On registration the server re-validates the click belongs to that event and is in the window, then snapshots the UTM values onto the registration, so editing a campaign later never rewrites history. Visiting the plain event URL never overwrites it; a newer tracked click does.
- **Security**: every table has RLS enabled with no public policies; all data access goes through the server with the service-role key, and every dashboard query is gated by `requireEvent` (owner / team role). Ticket links use unguessable random tokens, and check-in requires an authenticated team member.
- **Idempotent automations**: a partial unique index on `email_log(registration_id, kind) WHERE status='sent'` guarantees an email is never sent twice, and failures retry at most 3 times.
- **Honest analytics**: zero denominators show "—", "best campaign" requires ≥5 clicks, and clicks are documented as not being unique people.
- **Pure, tested logic**: attribution window, ticket parsing, stats, insights, forecast and templates are pure functions covered by unit tests.

## Tests & checks
`npm test` (unit tests) · `npx tsc --noEmit` · `npm run lint` · `npm run build`. CI runs all of them (`.github/workflows/ci.yml`).

## Known limitations
No payments, no AI features, no end-to-end browser tests yet; times are fixed to IST; Resend sandbox limits recipients until a domain is verified.
