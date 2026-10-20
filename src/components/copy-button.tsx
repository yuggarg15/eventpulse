"use client";
import { useState } from "react";
import { Copy } from "lucide-react";

export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn-ghost" onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); }}>
      <Copy size={13} /> {done ? "Copied!" : label}
    </button>
  );
}
