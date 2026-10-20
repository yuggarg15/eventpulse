# EventPulse (prototype)

Create events, share tracked campaign links (with QR codes), collect registrations, issue QR tickets, and check people in.
Stack: Next.js, Supabase (Postgres + Auth), Tailwind, Recharts.

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase values.
3. In Supabase > SQL Editor, run everything in `supabase/schema.sql` (once).
4. `npm run dev` then open http://localhost:3000, sign up, create an event.

## Deploy (Netlify)
Add these environment variables in Netlify (Site configuration > Environment variables):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` (your Netlify site URL, no trailing slash).

## How tracking works
`/go/<code>` records a click, sets a 7-day cookie for that event, and redirects to `/e/<slug>?utm_...`.
At registration the server checks the cookie's click belongs to the event and is under 7 days old, then copies the UTM values onto the registration.
Visiting the plain event URL later never overwrites it; a newer tracked click does.

## Security model (kept simple)
All tables have Row Level Security on with no public policies, so the browser can't read them.
All data access happens on the server with the service-role key, and every dashboard query checks the event belongs to the signed-in user.

## Not included yet
Waitlist, confirmation emails (ticket is shown on the confirmation page instead), banner uploads, settings page, multi-user event access.

## Tests
`npm test`
