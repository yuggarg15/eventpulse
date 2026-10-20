"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { checkInById, checkInByScan, type CheckInResult } from "@/app/actions";

type Att = { id: string; name: string; email: string; checkedIn: boolean };

export function CheckIn({ eventId, attendees, confirmed }: { eventId: string; attendees: Att[]; confirmed: number }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const busy = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [q, setQ] = useState("");
  const [manualToken, setManualToken] = useState("");
  const checked = attendees.filter((a) => a.checkedIn).length;

  const handle = async (p: Promise<CheckInResult>) => { const r = await p; setResult(r); if (r.kind === "success") router.refresh(); return r; };

  async function start() {
    setCamError(""); setScanning(true);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(undefined, video.current!, async (res) => {
        if (!res || busy.current) return;
        busy.current = true;
        await handle(checkInByScan(eventId, res.getText()));
        setTimeout(() => { busy.current = false; }, 2500); // avoid re-reading the same code instantly
      });
      stopRef.current = () => controls.stop();
    } catch (e) {
      setScanning(false);
      const denied = e instanceof Error && /permission|denied|notallowed/i.test(e.name + e.message);
      setCamError(denied ? "Camera permission was denied. Allow camera access in your browser, or use manual lookup below." : "Could not start the camera. Use manual lookup below.");
    }
  }
  function stop() { stopRef.current?.(); stopRef.current = null; setScanning(false); }
  useEffect(() => () => stopRef.current?.(), []);

  const matches = q.trim() ? attendees.filter((a) => (a.name + a.email).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];
  const tone = result?.kind === "success" ? "bg-green-50 text-green-800" : result?.kind === "duplicate" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800";
  const Icon = result?.kind === "success" ? CheckCircle2 : result?.kind === "duplicate" ? AlertTriangle : XCircle;

  return (
    <div className="space-y-5">
      <div className="card flex items-center justify-between">
        <div><p className="text-xs font-medium uppercase text-slate-500">Checked in</p><p className="text-3xl font-semibold">{checked} <span className="text-lg text-slate-400">/ {confirmed}</span></p></div>
        {scanning ? <button className="btn-ghost" onClick={stop}>Stop camera</button> : <button className="btn" onClick={start}><Camera size={16} /> Start scanning</button>}
      </div>
      {camError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{camError}</p>}
      <div className={scanning ? "card p-2" : "hidden"}><video ref={video} className="mx-auto aspect-square w-full max-w-sm rounded-lg bg-black object-cover" muted playsInline /></div>
      {result && (
        <div className={`flex items-start gap-3 rounded-xl p-4 ${tone}`}>
          <Icon className="mt-0.5 shrink-0" />
          <div><p className="font-semibold">{result.name ?? "Ticket"}</p><p className="text-sm">{result.message}</p></div>
        </div>
      )}
      <div className="card space-y-3">
        <h3 className="font-medium">Manual lookup</h3>
        <input className="input" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        {matches.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{a.name}</p><p className="truncate text-xs text-slate-500">{a.email}</p></div>
            <button className="btn" onClick={() => handle(checkInById(eventId, a.id))}>{a.checkedIn ? "Check again" : "Check in"}</button>
          </div>
        ))}
        {q.trim() && matches.length === 0 && <p className="text-sm text-slate-500">No confirmed attendee matches.</p>}
        <div className="border-t border-slate-100 pt-3">
          <p className="mb-1 text-xs text-slate-500">Or paste a ticket link / code</p>
          <div className="flex gap-2"><input className="input" value={manualToken} onChange={(e) => setManualToken(e.target.value)} />
            <button className="btn-ghost" onClick={() => manualToken && handle(checkInByScan(eventId, manualToken))}>Check in</button></div>
        </div>
      </div>
    </div>
  );
}
