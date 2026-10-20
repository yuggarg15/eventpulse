export type AutomationKind = "confirmation" | "reminder" | "feedback" | "certificate" | "no_show" | "waitlist_promoted" | "low_signups";

export const AUTOMATION_META: Record<AutomationKind, { title: string; when: string; offset?: string; subject: string; body: string; offset_hours: number }> = {
  confirmation: {
    title: "Registration confirmation", when: "Right after someone registers", offset_hours: 0,
    subject: "You're registered for {{event}}",
    body: "Hi {{name}},\n\nYou're in! {{event}} takes place on {{date}}{{venue_line}}.\n\nShow the QR code below at the entrance to check in.",
  },
  reminder: {
    title: "Event reminder", when: "Before the event starts", offset: "hours before start", offset_hours: 24,
    subject: "Reminder: {{event}} is coming up",
    body: "Hi {{name}},\n\nA quick reminder that {{event}} starts on {{date}}{{venue_line}}.\n\nHave your ticket QR ready.",
  },
  feedback: {
    title: "Feedback request", when: "After the event ends (checked-in attendees)", offset: "hours after end", offset_hours: 2,
    subject: "How was {{event}}?",
    body: "Hi {{name}},\n\nThanks for coming to {{event}}. It takes 20 seconds to tell us how it went.",
  },
  certificate: {
    title: "Participation certificate", when: "After the event ends (checked-in attendees)", offset: "hours after end", offset_hours: 3,
    subject: "Your certificate for {{event}}",
    body: "Hi {{name}},\n\nThank you for participating in {{event}}. Your certificate is ready.",
  },
  no_show: {
    title: "We missed you", when: "After the event ends (registered but did not attend)", offset: "hours after end", offset_hours: 4,
    subject: "We missed you at {{event}}",
    body: "Hi {{name}},\n\nWe noticed you couldn't make it to {{event}}. We hope to see you at the next one!",
  },
  waitlist_promoted: {
    title: "Waitlist promotion", when: "When a waitlisted person gets a spot", offset_hours: 0,
    subject: "Good news: you got a spot at {{event}}",
    body: "Hi {{name}},\n\nA spot opened up and you're now confirmed for {{event}} on {{date}}{{venue_line}}.",
  },
  low_signups: {
    title: "Low sign-ups alert (to you)", when: "7 days before start, if under 50% of capacity", offset_hours: 0,
    subject: "{{event}} is under 50% full",
    body: "Hi {{organizer}},\n\n{{event}} starts on {{date}} and is below half of its capacity. Open your analytics to see which channel converts best and push it.",
  },
};

export const AUTOMATION_KINDS = Object.keys(AUTOMATION_META) as AutomationKind[];
