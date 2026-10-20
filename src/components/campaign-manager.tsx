"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import { Copy, Download, Printer } from "lucide-react";
import { saveCampaign, setCampaignStatus } from "@/app/actions";
import { CHANNELS, fmtPct } from "@/lib/utils";
import { Field, Msg } from "./ui";

export type CampaignView = {
  id: string; name: string; channel: string; description: string | null; status: string; created_at: string;
  utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string | null; utm_term: string | null;
  trackUrl: string; destUrl: string;
  clicks: number; visits: number; registrations: number; checkins: number; conversion: number | null;
};

function CampaignForm({ eventId, slug, initial, onDone }: { eventId: string; slug: string; initial?: CampaignView; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveCampaign.bind(null, eventId), undefined);
  const [channel, setChannel] = useState(initial?.channel ?? "Instagram");
  const [source, setSource] = useState(initial?.utm_source ?? CHANNELS.Instagram.source);
  const [medium, setMedium] = useState(initial?.utm_medium ?? CHANNELS.Instagram.medium);
  const [campaign, setCampaign] = useState(initial?.utm_campaign ?? slug.replace(/-/g, "_"));
  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);
  const pick = (c: string) => { setChannel(c); setSource(CHANNELS[c].source); setMedium(CHANNELS[c].medium); };
  return (
    <form action={action} className="card space-y-3">
      <h3 className="font-medium">{initial ? "Edit link" : "New tracked link"}</h3>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Link name"><input name="name" required defaultValue={initial?.name} placeholder="Instagram Story — Main" className="input" /></Field>
        <Field label="Channel">
          <select name="channel" value={channel} onChange={(e) => pick(e.target.value)} className="input">
            {Object.keys(CHANNELS).map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Description (optional)"><input name="description" defaultValue={initial?.description ?? ""} className="input" /></Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="utm_source"><input name="utm_source" value={source} onChange={(e) => setSource(e.target.value)} required className="input" /></Field>
        <Field label="utm_medium"><input name="utm_medium" value={medium} onChange={(e) => setMedium(e.target.value)} required className="input" /></Field>
        <Field label="utm_campaign"><input name="utm_campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} required className="input" /></Field>
        <Field label="utm_content"><input name="utm_content" defaultValue={initial?.utm_content ?? ""} className="input" placeholder="story_main" /></Field>
        <Field label="utm_term (optional)"><input name="utm_term" defaultValue={initial?.utm_term ?? ""} className="input" /></Field>
      </div>
      <Msg state={state} />
      <div className="flex gap-2">
        <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <button type="button" className="btn-ghost" onClick={onDone}>Close</button>
      </div>
    </form>
  );
}

function QrPanel({ c, onClose }: { c: CampaignView; onClose: () => void }) {
  const [png, setPng] = useState("");
  useEffect(() => { QRCode.toDataURL(c.trackUrl, { width: 600, margin: 2 }).then(setPng); }, [c.trackUrl]);
  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<body style="text-align:center;font-family:sans-serif"><h2>${c.name.replace(/</g, "&lt;")}</h2><img src="${png}" width="400"/><p>${c.trackUrl}</p></body>`);
    w.document.close(); w.focus(); w.print();
  };
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between"><h3 className="font-medium">QR code — {c.name}</h3><button className="btn-ghost" onClick={onClose}>Close</button></div>
      {png && <img src={png} alt="QR code" className="mx-auto h-56 w-56" />}
      <p className="break-all text-center text-xs text-slate-500">{c.trackUrl}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <a href={png} download={`qr-${c.name.replace(/\W+/g, "-")}.png`} className="btn"><Download size={14} /> Download PNG</a>
        <button className="btn-ghost" onClick={print}><Printer size={14} /> Print</button>
      </div>
      <p className="text-xs text-slate-500">This QR contains the tracking link, so scans are credited to this campaign. For printed posters, keep this link active — if it is turned off, scanners see an “unavailable” page.</p>
    </div>
  );
}

export function CampaignManager({ eventId, slug, rows }: { eventId: string; slug: string; rows: CampaignView[] }) {
  const [editing, setEditing] = useState<CampaignView | "new" | null>(null);
  const [qr, setQr] = useState<CampaignView | null>(null);
  const [copied, setCopied] = useState("");
  const [, start] = useTransition();
  const copy = async (c: CampaignView) => { await navigator.clipboard.writeText(c.trackUrl); setCopied(c.id); setTimeout(() => setCopied(""), 1800); };
  const setStatus = (id: string, s: "active" | "inactive" | "archived") => start(() => setCampaignStatus(eventId, id, s));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Each link counts clicks and credits registrations to its channel.</p>
        <button className="btn" onClick={() => { setEditing("new"); setQr(null); }}>New link</button>
      </div>
      {editing && <CampaignForm key={editing === "new" ? "new" : editing.id} eventId={eventId} slug={slug} initial={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      {qr && <QrPanel c={qr} onClose={() => setQr(null)} />}
      {rows.length === 0 ? (
        <div className="card py-10 text-center text-sm text-slate-500">No tracked links yet. Create one for each place you will promote this event.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-slate-200"><tr>
              {["Name", "UTM", "Status", "Clicks", "Visits", "Regs", "Check-ins", "Conv.", ""].map((h) => <th key={h} className="th">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr key={c.id} className={c.status === "archived" ? "opacity-60" : ""}>
                  <td className="td"><p className="font-medium">{c.name}</p><p className="text-xs text-slate-500">{c.channel} · {new Date(c.created_at).toLocaleDateString("en-IN")}</p></td>
                  <td className="td text-xs text-slate-600" title={c.destUrl}>{c.utm_source} / {c.utm_medium}<br />{c.utm_campaign}{c.utm_content ? ` / ${c.utm_content}` : ""}</td>
                  <td className="td"><span className="badge capitalize">{c.status}</span></td>
                  <td className="td">{c.clicks}</td><td className="td">{c.visits}</td><td className="td">{c.registrations}</td><td className="td">{c.checkins}</td>
                  <td className="td">{fmtPct(c.conversion)}</td>
                  <td className="td"><div className="flex flex-wrap justify-end gap-1">
                    <button className="btn-ghost" onClick={() => copy(c)}><Copy size={13} /> {copied === c.id ? "Copied!" : "Copy"}</button>
                    <button className="btn-ghost" onClick={() => { setQr(c); setEditing(null); }}>QR</button>
                    <button className="btn-ghost" onClick={() => { setEditing(c); setQr(null); }}>Edit</button>
                    {c.status === "active" && <button className="btn-ghost" onClick={() => setStatus(c.id, "inactive")}>Deactivate</button>}
                    {c.status !== "active" && <button className="btn-ghost" onClick={() => setStatus(c.id, "active")}>Reactivate</button>}
                    {c.status !== "archived" && <button className="btn-danger" onClick={() => confirm("Archive this link? It stops working; stats are kept.") && setStatus(c.id, "archived")}>Archive</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500">Clicks = visits to a tracked link (not unique people). Visits = event pages loaded after a click. Conv. = registrations ÷ clicks.</p>
    </div>
  );
}
