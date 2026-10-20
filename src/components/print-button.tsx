"use client";
import { Printer } from "lucide-react";
export function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return <button className="btn-ghost print:hidden" onClick={() => window.print()}><Printer size={14} /> {label}</button>;
}
