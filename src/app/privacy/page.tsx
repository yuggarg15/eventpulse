import Link from "next/link";

export default function Privacy() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-6">
      <Link href="/" className="text-sm text-indigo-600">← EventPulse</Link>
      <h1 className="text-2xl font-bold">Privacy</h1>
      <p>EventPulse collects only what is needed to run events.</p>
      <ul className="list-disc space-y-2 pl-5 text-slate-700">
        <li><b>Attendees:</b> the name, email and optional phone number and answers you enter when registering. These are visible to the event&apos;s organisers only.</li>
        <li><b>Campaign tracking:</b> when you open a tracked link we count the click and store a first-party cookie (up to 7 days) that remembers which link brought you to that event, so the organiser can see which channel worked. No fingerprinting, no third-party trackers, and no IP addresses are stored.</li>
        <li><b>Emails:</b> ticket, reminder and follow-up emails are sent through an email provider on the organiser&apos;s behalf.</li>
        <li><b>Your ticket</b> is accessible only through its private link. Keep it to yourself.</li>
      </ul>
    </main>
  );
}
