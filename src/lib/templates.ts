import type { EventRow } from "./supabase";

export const EVENT_TEMPLATES: Record<string, { label: string; blurb: string; values: Partial<EventRow> }> = {
  workshop: {
    label: "Workshop", blurb: "Hands-on session with a limited number of seats",
    values: { category: "Workshop", format: "in_person", capacity: 40, waitlist_enabled: true, description: "Join us for a hands-on workshop.\n\nWhat you will learn:\n- \n- \n\nBring: your laptop.",
      certificate_text: "for participating in the workshop", custom_questions: [{ id: "q1", label: "What do you hope to learn?", type: "text" }] },
  },
  hackathon: {
    label: "Hackathon", blurb: "Teams, experience levels, phone number for coordination",
    values: { category: "Hackathon", format: "in_person", ask_phone: true, capacity: 150, waitlist_enabled: true, description: "A day of building, learning and shipping.\n\nSchedule:\n- Kick-off\n- Hacking\n- Demos and prizes",
      certificate_text: "for participating in the hackathon", custom_questions: [{ id: "q1", label: "Team name (if any)", type: "text" }, { id: "q2", label: "Experience level", type: "choice", options: ["Beginner", "Intermediate", "Advanced"], required: true }] },
  },
  webinar: {
    label: "Webinar", blurb: "Online talk with a join link",
    values: { category: "Webinar", format: "online", description: "An online session with live Q&A.", certificate_text: "for attending the webinar", custom_questions: [] },
  },
  meetup: {
    label: "Club meetup", blurb: "Casual community gathering",
    values: { category: "Meetup", format: "in_person", description: "Come meet the community.", certificate_text: "for being part of the community",
      custom_questions: [{ id: "q1", label: "Anything we should know (dietary needs, accessibility)?", type: "text" }] },
  },
};
