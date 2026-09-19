"use client";

import type { Activity } from "@/lib/activities";
import { formatCompact, formatDayLabel, isSameDay } from "@/lib/time";
import type { ActivityId } from "@/lib/types";

type DayTotal = {
  date: Date;
  total: number;
  byActivity: Record<ActivityId, number>;
};

type WeekChartProps = {
  days: DayTotal[];
  activities: Activity[];
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
};

export function WeekChart({
  days,
  activities,
  selectedDayIndex,
  onSelectDay,
}: WeekChartProps) {
  const max = Math.max(1, ...days.map((day) => day.total));
  const today = new Date();

  return (
    <div className="week-chart">
      {days.map((day, index) => {
        const height = Math.max(day.total > 0 ? 8 : 3, (day.total / max) * 100);
        return (
          <button
            key={day.date.toISOString()}
            type="button"
            className={`day-col ${index === selectedDayIndex ? "selected" : ""}`}
            onClick={() => onSelectDay(index)}
          >
            <span className="bar" style={{ height: `${height}%` }}>
              {activities.map((activity) => {
                const value = day.byActivity[activity.id] ?? 0;
                if (value <= 0) return null;
                return (
                  <span
                    key={activity.id}
                    className="bar-slice"
                    style={{
                      height: `${(value / day.total) * 100}%`,
                      background: activity.color,
                    }}
                  />
                );
              })}
            </span>
            <span className="day-name">{formatDayLabel(day.date)}</span>
            <span className="day-total">
              {isSameDay(day.date, today) && day.total === 0
                ? "today"
                : day.total
                  ? formatCompact(day.total)
                  : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
