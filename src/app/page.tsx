import Link from "next/link";
import { Activity, BarChart3, Bell, Award, Link2, QrCode, Users, Share2, ListChecks, ArrowRight } from "lucide-react";
import { getUser } from "@/lib/supabase";

const features = [
  { icon: Link2, title: "Tracked campaign links", text: "One link and QR code per channel. See exactly which WhatsApp group, Instagram story or poster filled your event." },
  { icon: BarChart3, title: "Insights, not just charts", text: "Plain-English advice: which channel converts best, what's underperforming, and what to do before the event." },
  { icon: Bell, title: "Automations", text: "Confirmation, reminder, feedback, certificate and no-show emails run on their own. You just review the log." },
  { icon: QrCode, title: "QR tickets & fast check-in", text: "Scan tickets at the door, even when the Wi-Fi drops. Duplicates are caught instantly." },
  { icon: ListChecks, title: "Smart waitlist", text: "When an event fills up, people join a waitlist and are promoted automatically when a spot opens." },
  { icon: Share2, title: "Built-in referrals", text: "Every attendee gets a personal invite link. See who brings the most friends." },
  { icon: Award, title: "Certificates & feedback", text: "Attendees who checked in get a certificate and a feedback request automatically." },
  { icon: Users, title: "Teams & audience", text: "Add co-organisers and door volunteers. Build a database of everyone who ever attended." },
];

const steps = [["Create", "Set up an event from a template in a minute."], ["Promote", "Share a tracked link per channel."], ["Run", "Check people in with QR tickets."], ["Learn", "Automatic follow-ups and a clear report."]];

export default async function Home() {
  const user = await getUser();
  const cta = user ? <Link href="/dashboard" className="btn">Open dashboard</Link> : <Link href="/signup" className="btn">Start free <ArrowRight size={14} /></Link>;
  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between p-4">
        <span className="flex items-center gap-2 text-lg font-bold"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white"><Activity size={18} /></span>EventPulse</span>
        <div className="flex gap-2">{!user && <Link href="/login" className="btn-ghost">Log in</Link>}{cta}</div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
        <div className="space-y-5">
          <span className="badge !bg-indigo-50 !text-indigo-700">Built for clubs, colleges and community events</span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">Know which promotion filled your event.</h1>
          <p className="text-lg text-slate-600">EventPulse takes you from the first WhatsApp message to the last certificate: tracked links, registrations, QR check-in, and automatic follow-ups in one place.</p>
          <div className="flex gap-3">{cta}<a href="#features" className="btn-ghost">See features</a></div>
          <p className="text-sm text-slate-500">Free to use. No attendee accounts needed.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-xl">
          <p className="mb-3 text-sm font-medium">Tech Hackathon 2026 · Channel performance</p>
          {[["Instagram Story", 38, "bg-pink-500"], ["WhatsApp groups", 74, "bg-green-500"], ["Poster QR", 22, "bg-indigo-500"], ["Email", 31, "bg-amber-500"]].map(([n, v, c]) => (
            <div key={String(n)} className="mb-3"><div className="mb-1 flex justify-between text-xs text-slate-600"><span>{n}</span><span>{v} registrations</span></div>
              <div className="h-2 rounded bg-slate-200"><div className={`h-2 rounded ${c}`} style={{ width: `${Number(v)}%` }} /></div></div>
          ))}
          <div className="mt-4 rounded-lg bg-white p-3 text-sm text-slate-700 shadow-sm">💡 Instagram has fewer clicks but converts <b>2×</b> better than WhatsApp. Shift effort there.</div>
          <p className="mt-3 text-right text-xs text-slate-400">Illustrative example</p>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-4">
          {steps.map(([t, d], i) => <div key={t}><p className="text-sm font-semibold text-indigo-600">Step {i + 1}</p><p className="text-lg font-semibold">{t}</p><p className="text-sm text-slate-600">{d}</p></div>)}
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">Everything between “announce” and “thank you”</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => <div key={f.title} className="card"><f.icon className="mb-3 text-indigo-600" size={22} /><p className="font-semibold">{f.title}</p><p className="mt-1 text-sm text-slate-600">{f.text}</p></div>)}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 pb-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Run your next event with data, not guesses.</h2>
        <div className="mt-6 flex justify-center">{cta}</div>
      </section>
      <footer className="border-t border-slate-200 p-6 text-center text-sm text-slate-500">EventPulse · <Link href="/privacy" className="underline">Privacy</Link></footer>
    </div>
  );
}
