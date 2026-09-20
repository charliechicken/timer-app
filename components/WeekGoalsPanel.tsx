"use client";

import { useState } from "react";
import type { Activity } from "@/lib/activities";
import { formatCompact } from "@/lib/time";
import {
  isActivityGroup,
  type GoalDirection,
  type WeekGoalScope,
  type WeekGoalStatus,
} from "@/lib/weekGoals";

type WeekGoalsPanelProps = {
  activities: Activity[];
  statuses: WeekGoalStatus[];
  error?: string | null;
  onSave: (input: {
    scope: WeekGoalScope;
    targetHours: number;
    direction: GoalDirection;
  }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
};

export function WeekGoalsPanel({
  activities,
  statuses,
  error,
  onSave,
  onRemove,
}: WeekGoalsPanelProps) {
  const [scope, setScope] = useState<WeekGoalScope>("study");
  const [hours, setHours] = useState("10");
  const [direction, setDirection] = useState<GoalDirection>("aim-up");

  const visible = activities.filter((activity) => !activity.archived);

  return (
    <section className="panel">
      <div className="panel-title">
        <h3>Weekly goals</h3>
        <p>
          Aim-up goals turn green when you hit them. Cap goals turn red if you go over (e.g. YouTube).
        </p>
      </div>
      {error ? <p className="sync-error">{error}</p> : null}
      <form
        className="goal-form"
        onSubmit={(event) => {
          event.preventDefault();
          const targetHours = Number(hours);
          if (!Number.isFinite(targetHours) || targetHours < 0) return;
          void onSave({ scope, targetHours, direction });
        }}
      >
        <label>
          <span>What</span>
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value as WeekGoalScope)}
          >
            <option value="week">Whole week</option>
            <option value="study">Study (all classes)</option>
            <option value="club">Clubs</option>
            <option value="training">Gym time</option>
            <option value="life">Everything else</option>
            {visible.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.label}
                {isActivityGroup(activity.group) ? "" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Hours</span>
          <input
            type="number"
            min="0"
            step="0.5"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
          />
        </label>
        <label>
          <span>Type</span>
          <select
            value={direction}
            onChange={(event) => setDirection(event.target.value as GoalDirection)}
          >
            <option value="aim-up">Aim up (good to hit)</option>
            <option value="cap">Cap (bad to go over)</option>
          </select>
        </label>
        <button type="submit" className="stop">
          Save goal
        </button>
      </form>

      {statuses.length === 0 ? (
        <p className="empty">No weekly goals yet.</p>
      ) : (
        <ul className="week-goal-list">
          {statuses.map((status) => {
            const pct =
              status.targetMs > 0
                ? Math.min(100, Math.round((status.actualMs / status.targetMs) * 100))
                : 0;
            return (
              <li key={status.goal.id} className={`week-goal ${status.tone}`}>
                <div className="week-goal-head">
                  <strong>{status.label}</strong>
                  <span>
                    {status.goal.direction === "aim-up" ? "Aim up" : "Cap"} ·{" "}
                    {status.goal.targetHours}h
                  </span>
                </div>
                <div className="week-goal-bar">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div className="week-goal-meta">
                  <span>
                    {formatCompact(status.actualMs)}
                    {status.tone === "good"
                      ? status.goal.direction === "aim-up"
                        ? " — hit"
                        : " — under cap"
                      : status.tone === "bad"
                        ? " — over cap"
                        : " — in progress"}
                  </span>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => void onRemove(status.goal.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
