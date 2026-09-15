import { NextResponse } from "next/server";
import { ACTIVITY_MAP } from "@/lib/activities";
import type { ActivityId } from "@/lib/types";

type Body = {
  email?: string;
  activityId?: ActivityId;
  minutes?: number;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const email = body.email?.trim();
  const activityId = body.activityId;
  const minutes = body.minutes;
  if (!email || !activityId || !minutes) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  const activity = ACTIVITY_MAP[activityId]?.label ?? activityId;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "Email is not configured. Add RESEND_API_KEY on Vercel.",
    });
  }

  const from = process.env.TIMER_FROM_EMAIL ?? "Week Timer <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `${activity} timer finished`,
      text: `Your ${minutes}-minute timer for ${activity} is done.`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
