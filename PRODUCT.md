# EventPulse: product notes

## Problem
Student clubs and community organisers promote the same event on WhatsApp, Instagram, email and posters, collect registrations in a form, and then run the day on spreadsheets. They can't tell **which promotion worked**, how many registered people **actually came**, or follow up with anyone afterwards. The work is also repetitive (reminders, certificates, feedback), and it usually falls on one overloaded volunteer.

## Users
- **Organiser** (club core-team member, 18–25): runs 3–10 events a year, promotes in WhatsApp groups and on Instagram, needs certificates for attendees, has no budget.
- **Attendee**: wants one tap to register and a ticket on their phone; shouldn't need an account.
- **Door volunteer**: needs a scanner and nothing else.

## Positioning
Not "another ticketing tool". EventPulse is a **growth and automation layer for free community events**: it shows what is working and automates the follow-up.

## North-star metric
**Checked-in attendees per organiser per month**: it only goes up if organisers publish events, promote them effectively, and actually run them with the product.

Supporting metrics: activation (signup → published event → first registration → first check-in; the dashboard checklist walks organisers through exactly this funnel), registration→attendance rate, % of registrations attributed to a tracked link, automation usage.

## Prioritisation
1. Registration + tracked links + check-in (the core loop, and the differentiator).
2. Automations + certificates + feedback (removes repeat work; certificates are a strong pull for student events).
3. Waitlist, referrals, teams, audience (growth, retention and scale).
4. **Deliberately deferred**: payments (large compliance surface, not needed by free community events), AI-generated copy (nice-to-have), native apps.

## Monetisation (hypothesis)
Free for small events. Paid tier for organisations: unlimited events/teams, custom sender domain, white-label certificates, exports and sponsor reports. Paid ticketing with a per-ticket fee would be the next expansion.

## Risks & open questions
- Email deliverability needs a verified domain; WhatsApp reminders (via a Business API) would likely outperform email for this audience.
- Attribution is last-click within 7 days, so cross-device journeys show up as "direct".
- Next: sponsor ROI reports, recurring event series, payment integration, WhatsApp channel.
