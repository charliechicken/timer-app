import { ACTIVITY_MAP } from "./activities";
import { formatAlertStamp } from "./time";
import type { ActivityId } from "./types";

export type TimerAlertCopy = {
  id: string;
  stamp: string;
  subject: string;
  text: string;
  headers: Record<string, string>;
};

export function newAlertId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function timerAlertCopy(payload: {
  email: string;
  activityId: ActivityId;
  minutes: number;
  test?: boolean;
  at?: number;
}): TimerAlertCopy {
  const id = newAlertId();
  const stamp = formatAlertStamp(payload.at);
  const activity = ACTIVITY_MAP[payload.activityId]?.label ?? payload.activityId;
  const subject = payload.test
    ? `Week timer test | ${stamp} | ${id}`
    : `${activity} timer finished | ${stamp} | ${id}`;
  const text = payload.test
    ? `Test alert ${id} for ${payload.email} at ${stamp}. Each timer email is a new message, not a reply.`
    : `Your ${payload.minutes}-minute ${activity} timer finished at ${stamp}.\n\nAlert ${id}`;
  return {
    id,
    stamp,
    subject,
    text,
    headers: {
      "Message-ID": `<timer-${id}@timer-app.local>`,
      "X-Entity-Ref-ID": id,
    },
  };
}
