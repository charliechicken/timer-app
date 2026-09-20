"use client";

import { resolveActivity, type Activity } from "@/lib/activities";
import { formatCompact, formatDayLabel, formatWeekRange } from "@/lib/time";
import type { ActivityId } from "@/lib/types";
import type { WeekGoalStatus } from "@/lib/weekGoals";
import { weekGoalInsight } from "@/lib/weekGoals";

type DayTotal = {
  date: Date;
  total: number;
  byActivity: Record<ActivityId, number>;
};

type WeekReportProps = {
  weekStart: Date;
  weekTotal: number;
  studyTotal: number;
  clubTotal: number;
  lifeTotal: number;
  gymTotal: number;
  previousWeekTotal: number;
  sessionCount: number;
  busiestDay: DayTotal;
  totalsByActivity: Record<ActivityId, number>;
  activities: Activity[];
  goalStatuses?: WeekGoalStatus[];
  complete: boolean;
  wrappingUp: boolean;
};

export function WeekReport({
  weekStart,
  weekTotal,
  studyTotal,
  clubTotal,
  lifeTotal,
  gymTotal,
  previousWeekTotal,
  sessionCount,
  busiestDay,
  totalsByActivity,
  activities,
  goalStatuses = [],
  complete,
  wrappingUp,
}: WeekReportProps) {
  const ranked = activities
    .map((activity) => ({
      activity,
      ms: totalsByActivity[activity.id] ?? 0,
    }))
    .filter((row) => row.ms > 0)
    .sort((a, b) => b.ms - a.ms);
  const top = ranked[0];
  const max = Math.max(1, ...ranked.map((row) => row.ms));
  const delta = weekTotal - previousWeekTotal;
  const headline = complete
    ? "Weekly report"
    : wrappingUp
      ? "This week is wrapping up"
      : "Week so far";

  return (
    <section className={`panel report ${complete || wrappingUp ? "featured" : ""}`}>
      <div className="panel-title">
        <div>
          <p className="eyebrow">{formatWeekRange(weekStart)}</p>
          <h3>{headline}</h3>
        </div>
        <p>
          {sessionCount
            ? `${sessionCount} session${sessionCount === 1 ? "" : "s"}`
            : "No sessions yet"}
        </p>
      </div>

      <div className="report-stats">
        <article>
          <p>Tracked</p>
          <strong>{formatCompact(weekTotal)}</strong>
        </article>
        <article>
          <p>Study</p>
          <strong>{formatCompact(studyTotal)}</strong>
        </article>
        <article>
          <p>Clubs</p>
          <strong>{formatCompact(clubTotal)}</strong>
        </article>
        <article>
          <p>Gym</p>
          <strong>{formatCompact(gymTotal)}</strong>
        </article>
        <article>
          <p>Everything else</p>
          <strong>{formatCompact(lifeTotal)}</strong>
        </article>
      </div>

      <p className="report-insight">
        {weekTotal === 0
          ? "Nothing tracked this week yet."
          : [
              top
                ? `${resolveActivity(top.activity.id, activities).label} took the most time.`
                : null,
              busiestDay.total
                ? `${formatDayLabel(busiestDay.date)} was the busiest day.`
                : null,
              previousWeekTotal
                ? `${formatCompact(Math.abs(delta))} ${delta >= 0 ? "more" : "less"} than the week before.`
                : null,
            ]
              .filter(Boolean)
              .join(" ")}
      </p>

      {goalStatuses.length ? (
        <ul className="week-goal-list compact">
          {goalStatuses.map((status) => (
            <li key={status.goal.id} className={`week-goal ${status.tone}`}>
              <span>{weekGoalInsight(status)}</span>
            </li>
          ))}
        </ul>
      ) : null}

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
                    width: `${(row.ms / max) * 100}%`,
                    background: row.activity.color,
                  }}
                />
              </span>
              <span className="rank-time">{formatCompact(row.ms)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
