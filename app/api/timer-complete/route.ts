import { NextResponse } from "next/server";
import { ACTIVITY_MAP } from "@/lib/activities";
import { sendWithFormSubmit } from "@/lib/inboxMail";
import type { ActivityId } from "@/lib/types";

type Body = {
  email?: string;
  activityId?: ActivityId;
  minutes?: number;
  test?: boolean;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const email = body.email?.trim();
  const activityId = body.activityId;
  const minutes = body.minutes;
  if (!email || !activityId || typeof minutes !== "number" || minutes <= 0) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  const activity = ACTIVITY_MAP[activityId]?.label ?? activityId;
  const subject = body.test
    ? "Week timer email is working"
    : `${activity} timer finished`;
  const text = body.test
    ? `This is a test email for ${email}. Countdown alerts will come here.`
    : `Your ${minutes}-minute timer for ${activity} is done.`;

  const resend = await sendWithResend(email, subject, text);
  if (resend.ok) {
    return NextResponse.json({ ok: true, provider: "resend" });
  }

  const fallback = await sendWithFormSubmit(email, subject, text);
  if (fallback.ok) {
    return NextResponse.json({
      ok: true,
      provider: "inbox",
      pendingConfirm: fallback.pendingConfirm ?? false,
    });
  }

  return NextResponse.json(
    {
      ok: false,
      error: resend.error || fallback.error || "Could not send email",
    },
    { status: 502 },
  );
}

async function sendWithResend(
  email: string,
  subject: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false };

  const from = process.env.TIMER_FROM_EMAIL ?? "Week Timer <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [email], subject, text }),
  });

  if (!response.ok) {
    return { ok: false, error: await response.text() };
  }
  return { ok: true };
}
