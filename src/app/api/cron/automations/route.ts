import { NextResponse } from "next/server";
import { runAllAutomations } from "@/lib/automations";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAllAutomations();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Cron automations error:", error);
    return NextResponse.json({ error: "Automation run failed" }, { status: 500 });
  }
}
