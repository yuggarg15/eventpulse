import { NextResponse } from "next/server";
import { runAutomations } from "@/lib/automations";

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await runAutomations());
}
export const POST = handle;
export const GET = handle;
