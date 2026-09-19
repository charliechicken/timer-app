"use client";

import { resolveActivity, type Activity } from "@/lib/activities";
import { addDays, formatClock, formatCompact } from "@/lib/time";
import type { Session } from "@/lib/types";

type SessionListProps = {
  date: Date;
  sessions: Session[];
  now: number;
  activities?: Activity[];
  onDelete: (sessionId: string) => void;
};

export function SessionList({
  date,
  sessions,
  now,
  activities,
  onDelete,
}: SessionListProps) {
  const dayStart = date.getTime();
  const dayEnd = addDays(date, 1).getTime();
  const heading = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="session-list">
      <div className="session-heading">
        <h3>{heading}</h3>
        <p>
          {sessions.length
            ? `${sessions.length} session${sessions.length === 1 ? "" : "s"}`
            : "No sessions"}
        </p>
      </div>
      {sessions.length === 0 ? (
        <p className="empty">Nothing tracked this day yet.</p>
      ) : (
        <ul>
          {sessions.map((session) => {
            const activity = resolveActivity(session.activityId, activities);
            const duration = Math.max(
              0,
              Math.min(session.endAt ?? now, dayEnd) - Math.max(session.startAt, dayStart),
            );
            const started = new Date(session.startAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
            return (
              <li key={session.id}>
                <span className="dot" style={{ background: activity.color }} />
                <div>
                  <p className="session-label">
                    {activity.label}
                    {session.endAt === null ? <em> live</em> : null}
                    {session.targetEndAt ? <em> timed</em> : null}
                    {session.manual ? <em> added</em> : null}
                  </p>
                  <p className="session-time">
                    {started} · {formatCompact(duration)}
                  </p>
                </div>
                <span className="session-clock">{formatClock(duration)}</span>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => onDelete(session.id)}
                  aria-label={`Delete ${activity.label} session`}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
