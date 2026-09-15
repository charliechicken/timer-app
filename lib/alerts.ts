import { ACTIVITY_MAP } from "./activities";
import { getGmailToken, sendMailWithGmail } from "./gmail";
import { sendWithFormSubmit } from "./inboxMail";
import type { ActivityId } from "./types";

export function playTimerSound(): void {
  const audio = new AudioContext();
  void audio.resume();
  const now = audio.currentTime;
  [0, 0.18, 0.36].forEach((offset, index) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = index === 2 ? 880 : 660;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.12, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.18);
  });
}

export async function showTimerNotification(
  activityId: ActivityId,
  minutes: number,
): Promise<void> {
  const title = `${ACTIVITY_MAP[activityId].label} is done`;
  const body = `${minutes} minute timer finished.`;
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

export async function emailTimerComplete(payload: {
  email: string;
  activityId: ActivityId;
  minutes: number;
  test?: boolean;
}): Promise<{ ok: boolean; pendingConfirm?: boolean; error?: string }> {
  const activity = ACTIVITY_MAP[payload.activityId]?.label ?? payload.activityId;
  const subject = payload.test
    ? "Week timer email is working"
    : `${activity} timer finished`;
  const text = payload.test
    ? `This is a test email for ${payload.email}. Countdown alerts will come here.`
    : `Your ${payload.minutes}-minute timer for ${activity} is done.`;

  const token = getGmailToken();
  if (token) {
    const gmail = await sendMailWithGmail({
      to: payload.email,
      subject,
      text,
      token,
    });
    if (gmail.ok) return { ok: true };
  }

  const inbox = await sendWithFormSubmit(payload.email, subject, text);
  if (inbox.ok) return inbox;

  const response = await fetch("/api/timer-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    pendingConfirm?: boolean;
    error?: string;
  };
  if (!response.ok || !body.ok) {
    return {
      ok: false,
      error: body.error ?? inbox.error ?? "Could not send email",
    };
  }
  return { ok: true, pendingConfirm: body.pendingConfirm };
}

export async function requestAlertPermission(): Promise<void> {
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
}
