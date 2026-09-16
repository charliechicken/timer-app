"use client";

import { ACTIVITIES, ACTIVITY_MAP } from "@/lib/activities";
import {
  addDays,
  formatCompact,
  formatHourLabel,
  formatTime,
  isSameDay,
  overlapMs,
} from "@/lib/time";
import type { ActivityId, Session } from "@/lib/types";

const HOUR_PX = 72;
const MIN_EVENT_PX = 22;
const GAP_PX = 3;

type DayViewProps = {
  date: Date;
  sessions: Session[];
  now: number;
  previousDayTotal?: number;
  onDelete: (sessionId: string) => void;
};

type LaidOut = {
  session: Session;
  start: number;
  end: number;
  stack: number;
  top: number;
  height: number;
};

function blocksForDay(sessions: Session[], dayStart: number, dayEnd: number, now: number) {
  return sessions
    .map((session) => {
      const start = Math.max(session.startAt, dayStart);
      const end = Math.min(session.endAt ?? now, dayEnd);
      return { session, start, end };
    })
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start - b.start || b.end - a.end);
}

function layoutBlocks(
  raw: { session: Session; start: number; end: number }[],
  gridStartMs: number,
): LaidOut[] {
  return raw.map((block) => {
    const top = ((block.start - gridStartMs) / 3_600_000) * HOUR_PX;
    const natural = Math.max(
      MIN_EVENT_PX,
      ((block.end - block.start) / 3_600_000) * HOUR_PX,
    );
    const next = raw
      .filter((other) => other.start >= block.end)
      .sort((a, b) => a.start - b.start)[0];
    const maxBottom = next
      ? ((next.start - gridStartMs) / 3_600_000) * HOUR_PX - GAP_PX
      : Number.POSITIVE_INFINITY;
    const height = Math.max(18, Math.min(natural, maxBottom - top));
    const stack = raw.filter(
      (other) => other.start < block.end && other.end > block.start && other !== block,
    ).length;
    return { ...block, stack, top, height };
  });
}

export function DayView({
  date,
  sessions,
  now,
  previousDayTotal = 0,
  onDelete,
}: DayViewProps) {
  const dayStart = date.getTime();
  const dayEnd = addDays(date, 1).getTime();
  const raw = blocksForDay(sessions, dayStart, dayEnd, now);
  const today = isSameDay(date, new Date());
  const heading = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const totals = Object.fromEntries(ACTIVITIES.map((activity) => [activity.id, 0])) as Record<
    ActivityId,
    number
  >;
  let total = 0;
  for (const session of sessions) {
    const duration = overlapMs(session.startAt, session.endAt ?? now, dayStart, dayEnd);
    totals[session.activityId] += duration;
    total += duration;
  }

  const study = ACTIVITIES.filter((activity) => activity.group === "study").reduce(
    (sum, activity) => sum + totals[activity.id],
    0,
  );
  const clubs = ACTIVITIES.filter((activity) => activity.group === "club").reduce(
    (sum, activity) => sum + totals[activity.id],
    0,
  );
  const gym = totals.gym;
  const screens = totals.youtube + totals.instagram;
  const ranked = ACTIVITIES.map((activity) => ({ activity, ms: totals[activity.id] }))
    .filter((row) => row.ms > 0)
    .sort((a, b) => b.ms - a.ms);
  const top = ranked[0];
  const longest = raw.reduce<(typeof raw)[number] | null>(
    (best, block) =>
      !best || block.end - block.start > best.end - best.start ? block : best,
    null,
  );
  const first = raw[0];
  const last = raw.reduce<(typeof raw)[number] | null>(
    (latest, block) => (!latest || block.end > latest.end ? block : latest),
    null,
  );

  const insight = !total
    ? "Nothing tracked this day yet. Start a timer or add time."
    : [
        `You tracked ${formatCompact(total)}.`,
        top ? `${top.activity.label} took the most time (${formatCompact(top.ms)}).` : null,
        study ? `${formatCompact(study)} was studying.` : null,
        first && last
          ? `The day ran from ${formatTime(first.start)} to ${formatTime(last.end)}.`
          : null,
        longest
          ? `Longest stretch: ${ACTIVITY_MAP[longest.session.activityId].label} for ${formatCompact(longest.end - longest.start)}.`
          : null,
        screens ? `YouTube and Instagram were ${formatCompact(screens)}.` : null,
        previousDayTotal
          ? `${formatCompact(Math.abs(total - previousDayTotal))} ${total >= previousDayTotal ? "more" : "less"} than the day before.`
          : null,
      ]
        .filter(Boolean)
        .join(" ");

  const firstHour = raw.length
    ? Math.min(7, ...raw.map((block) => new Date(block.start).getHours()))
    : 7;
  const lastHour = raw.length
    ? Math.max(21, ...raw.map((block) => new Date(block.end - 1).getHours() + 1))
    : 21;
  const hours = Array.from(
    { length: Math.max(1, lastHour - firstHour) },
    (_, index) => firstHour + index,
  );
  const gridStart = new Date(date);
  gridStart.setHours(firstHour, 0, 0, 0);
  const gridStartMs = gridStart.getTime();
  const laidOut = layoutBlocks(raw, gridStartMs);
  const nowTop = ((now - gridStartMs) / 3_600_000) * HOUR_PX;

  return (
    <div className="day-view">
      <div className="session-heading">
        <h3>Daily insights</h3>
        <p>{heading}</p>
      </div>
      <div className="report-stats day-stats">
        <article>
          <p>Tracked</p>
          <strong>{formatCompact(total)}</strong>
        </article>
        <article>
          <p>Study</p>
          <strong>{formatCompact(study)}</strong>
        </article>
        <article>
          <p>Clubs + gym</p>
          <strong>{formatCompact(clubs + gym)}</strong>
        </article>
        <article>
          <p>Sessions</p>
          <strong>{raw.length}</strong>
        </article>
      </div>
      <p className="report-insight">{insight}</p>
      {ranked.length ? (
        <ol className="report-ranks">
          {ranked.map((row) => (
            <li key={row.activity.id}>
              <span className="rank-label">
                <span className="dot" style={{ background: row.activity.color }} />
                {row.activity.label}
              </span>
              <span className="rank-bar">
                <span
                  style={{
                    width: `${(row.ms / Math.max(1, ranked[0].ms)) * 100}%`,
                    background: row.activity.color,
                  }}
                />
              </span>
              <span className="rank-time">{formatCompact(row.ms)}</span>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="gcal-wrap">
        <p className="eyebrow">Day calendar</p>
        {raw.length === 0 ? (
          <p className="empty">No blocks on this day yet.</p>
        ) : null}
        <div className="gcal" style={{ height: hours.length * HOUR_PX }}>
          <div className="gcal-hours">
            {hours.map((hour) => (
              <div key={hour} className="gcal-hour" style={{ height: HOUR_PX }}>
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>
          <div className="gcal-track">
            {hours.map((hour) => (
              <div key={hour} className="gcal-line" style={{ height: HOUR_PX }} />
            ))}
            {laidOut.map((block, index) => {
              const activity = ACTIVITY_MAP[block.session.activityId];
              const inset = 8 + block.stack * 10;
              return (
                <div
                  key={block.session.id}
                  className="gcal-event"
                  style={{
                    top: block.top,
                    height: block.height,
                    left: inset,
                    right: 8,
                    background: activity.color,
                    zIndex: index + 1,
                  }}
                  title={`${activity.label} · ${formatTime(block.start)} – ${formatTime(block.end)}`}
                >
                  <strong>{activity.shortLabel}</strong>
                  <span>
                    {formatTime(block.start)}–{formatTime(block.end)}
                    {block.session.endAt === null ? " live" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(block.session.id)}
                    aria-label={`Delete ${activity.label} session`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {today && nowTop >= 0 && nowTop <= hours.length * HOUR_PX ? (
              <div className="gcal-now" style={{ top: nowTop }}>
                <span />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
