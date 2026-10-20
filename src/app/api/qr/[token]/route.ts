import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { appUrl } from "@/lib/utils";

// PNG of a ticket QR, used inside emails. The URL contains the token the ticket page already uses.
export async function GET(_: Request, { params }: RouteContext<"/api/qr/[token]">) {
  const { token } = await params;
  if (!/^[a-f0-9]{20,64}$/.test(token)) return new NextResponse("Not found", { status: 404 });
  const png = await QRCode.toBuffer(`${appUrl()}/ticket/${token}`, { width: 360, margin: 2 });
  return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
}
