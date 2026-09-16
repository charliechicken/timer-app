import { NextResponse } from "next/server";
import { ACTIVITY_MAP } from "@/lib/activities";
import { deliverEmail } from "@/lib/serverMail";
import type { ActivityId } from "@/lib/types";

type Body = {
  email?: string;
  activityId?: ActivityId;
  minutes?: number;
  test?: boolean;
  subject?: string;
  text?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  let subject = body.subject?.trim();
  let text = body.text?.trim();
  if (!subject || !text) {
    const activityId = body.activityId;
    const minutes = body.minutes;
    if (!activityId || typeof minutes !== "number" || minutes <= 0) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }
    const activity = ACTIVITY_MAP[activityId]?.label ?? activityId;
    subject = body.test ? "Week timer email is working" : `${activity} timer finished`;
    text = body.test
      ? `This is a test email for ${email}. Countdown alerts will come here.`
      : `Your ${minutes}-minute timer for ${activity} is done.`;
  }

  const result = await deliverEmail(email, subject, text);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    provider: result.provider,
    pendingConfirm: result.pendingConfirm ?? false,
  });
}
