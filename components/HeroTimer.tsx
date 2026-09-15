"use client";

import { ACTIVITY_MAP } from "@/lib/activities";
import { formatClock, formatCompact } from "@/lib/time";
import type { Session } from "@/lib/types";

type HeroTimerProps = {
  activeSession: Session | null;
  now: number;
  weekTotal: number;
  classTotal: number;
  stale: boolean;
  onStop: () => void;
};

export function HeroTimer({
  activeSession,
  now,
  weekTotal,
  classTotal,
  stale,
  onStop,
}: HeroTimerProps) {
  const activity = activeSession ? ACTIVITY_MAP[activeSession.activityId] : null;
  const elapsed = activeSession ? now - activeSession.startAt : 0;

  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">{activity ? "Now tracking" : "Ready to track"}</p>
        <h1>{activity ? activity.label : "Tap something to start"}</h1>
        {stale ? (
          <p className="stale">
            This timer has been running a long time. Stop it if you forgot.
          </p>
        ) : (
          <p className="muted">
            {formatCompact(weekTotal)} this week · {formatCompact(classTotal)} studying
          </p>
        )}
      </div>
      <div className="hero-clock">
        <p
          className="clock"
          style={{ color: activity?.color ?? "var(--ink)" }}
        >
          {formatClock(elapsed)}
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
