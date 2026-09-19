"use client";

import { resolveActivity, type Activity } from "@/lib/activities";
import { formatClock, formatCompact } from "@/lib/time";
import type { Session } from "@/lib/types";

type HeroTimerProps = {
  activeSession: Session | null;
  now: number;
  weekTotal: number;
  classTotal: number;
  stale: boolean;
  idleTitle?: string;
  summary?: string;
  activities?: Activity[];
  onStop: () => void;
};

export function HeroTimer({
  activeSession,
  now,
  weekTotal,
  classTotal,
  stale,
  idleTitle = "Tap something to start",
  summary,
  activities,
  onStop,
}: HeroTimerProps) {
  const activity = activeSession
    ? resolveActivity(activeSession.activityId, activities)
    : null;
  const elapsed = activeSession ? now - activeSession.startAt : 0;
  const remaining =
    activeSession?.targetEndAt != null
      ? Math.max(0, activeSession.targetEndAt - now)
      : null;

  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">
          {activity
            ? remaining != null
              ? "Countdown"
              : "Now tracking"
            : "Ready to track"}
        </p>
        <h1>{activity ? activity.label : idleTitle}</h1>
        {stale ? (
          <p className="stale">
            This timer has been running a long time. Stop it if you forgot.
          </p>
        ) : remaining != null ? (
          <p className="muted">
            {formatClock(elapsed)} elapsed · email, notification, and sound at 0:00
          </p>
        ) : (
          <p className="muted">
            {summary ??
              `${formatCompact(weekTotal)} this week · ${formatCompact(classTotal)} studying`}
          </p>
        )}
      </div>
      <div className="hero-clock">
        <p
          className="clock"
          style={{ color: activity?.color ?? "var(--ink)" }}
        >
          {formatClock(remaining ?? elapsed)}
        </p>
        {activeSession ? (
          <button type="button" className="stop" onClick={onStop}>
            Stop
          </button>
        ) : (
          <p className="clock-hint">One activity at a time</p>
        )}
      </div>
    </section>
  );
}
