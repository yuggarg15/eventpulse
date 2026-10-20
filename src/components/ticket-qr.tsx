"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function TicketQr({ value }: { value: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => { QRCode.toDataURL(value, { width: 480, margin: 2 }).then(setSrc); }, [value]);
  return src ? <img src={src} alt="Ticket QR code" className="mx-auto h-60 w-60" /> : <div className="mx-auto h-60 w-60 animate-pulse rounded bg-slate-100" />;
}
