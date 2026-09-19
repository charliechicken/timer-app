"use client";

import { resolveActivity, type Activity } from "@/lib/activities";
import { addDays, formatHourLabel, formatTime, isSameDay } from "@/lib/time";
import type { Session } from "@/lib/types";

const HOUR_PX = 22;

type WeekCalendarProps = {
  weekStart: Date;
  sessions: Session[];
  now: number;
  selectedDay: Date;
  activities?: Activity[];
  onSelectDay: (date: Date) => void;
};

function blocksForDay(sessions: Session[], dayStart: number, dayEnd: number, now: number) {
  return sessions
    .map((session) => {
      const start = Math.max(session.startAt, dayStart);
      const end = Math.min(session.endAt ?? now, dayEnd);
      return { session, start, end };
    })
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start - b.start);
}

export function WeekCalendar({
  weekStart,
  sessions,
  now,
  selectedDay,
  activities,
  onSelectDay,
}: WeekCalendarProps) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const hours = Array.from({ length: 16 }, (_, index) => 6 + index);
  const gridStartHour = 6;

  return (
    <div className="week-cal">
      <p className="eyebrow">Week calendar</p>
      <div className="week-cal-grid">
        <div className="week-cal-hours">
          <span />
          {hours.map((hour) => (
            <span key={hour}>{formatHourLabel(hour)}</span>
          ))}
        </div>
        {days.map((day) => {
          const dayStart = day.getTime();
          const dayEnd = addDays(day, 1).getTime();
          const blocks = blocksForDay(sessions, dayStart, dayEnd, now);
          const selected = isSameDay(day, selectedDay);
          const today = isSameDay(day, new Date());
          return (
            <button
              key={dayStart}
              type="button"
              className={`week-cal-day ${selected ? "selected" : ""}`}
              onClick={() => onSelectDay(day)}
            >
              <strong>
                {day.toLocaleDateString("en-US", { weekday: "short" })} {day.getDate()}
              </strong>
              <span className="week-cal-track" style={{ height: hours.length * HOUR_PX }}>
                {hours.map((hour) => (
                  <i key={hour} className="week-cal-line" style={{ height: HOUR_PX }} />
                ))}
                {blocks.map((block) => {
                  const activity = resolveActivity(block.session.activityId, activities);
                  const top =
                    ((block.start - dayStart) / 3_600_000 - gridStartHour) * HOUR_PX;
                  const height = Math.max(
                    10,
                    ((block.end - block.start) / 3_600_000) * HOUR_PX,
                  );
                  return (
                    <span
                      key={block.session.id}
                      className="week-cal-event"
                      style={{
                        top,
                        height,
                        background: activity.color,
                      }}
                      title={`${activity.shortLabel} ${formatTime(block.start)}–${formatTime(block.end)}`}
                    >
                      {activity.shortLabel}
                    </span>
                  );
                })}
                {today ? (
                  <span
                    className="gcal-now"
                    style={{
                      top: ((now - dayStart) / 3_600_000 - gridStartHour) * HOUR_PX,
                    }}
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <p className="muted week-cal-hint">
        9pt labels. Tap a column to open that day’s detailed calendar.
      </p>
    </div>
  );
}
