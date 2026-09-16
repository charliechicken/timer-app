import { NextResponse } from "next/server";
import { deliverEmail } from "@/lib/serverMail";
import { timerAlertCopy } from "@/lib/timerAlert";
import type { ActivityId } from "@/lib/types";

type Body = {
  email?: string;
  activityId?: ActivityId;
  minutes?: number;
  test?: boolean;
  subject?: string;
  text?: string;
  headers?: Record<string, string>;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  let subject = body.subject?.trim();
  let text = body.text?.trim();
  let headers = body.headers;
  if (!subject || !text) {
    const activityId = body.activityId;
    const minutes = body.minutes;
    if (!activityId || typeof minutes !== "number" || minutes <= 0) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }
    const copy = timerAlertCopy({
      email,
      activityId,
      minutes,
      test: body.test,
    });
    subject = copy.subject;
    text = copy.text;
    headers = copy.headers;
  }

  const result = await deliverEmail(email, subject, text, headers);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    provider: result.provider,
    pendingConfirm: result.pendingConfirm ?? false,
  });
}
