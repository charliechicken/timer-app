import type { Activity, ActivityGroup, ActivityId } from "./activities";
import { formatCompact } from "./time";

export type GoalDirection = "aim-up" | "cap";

export type WeekGoalScope = ActivityId | ActivityGroup | "week";

export type WeekGoal = {
  id: string;
  scope: WeekGoalScope;
  targetHours: number;
  direction: GoalDirection;
};

export type WeekGoalStatus = {
  goal: WeekGoal;
  actualMs: number;
  targetMs: number;
  met: boolean;
  tone: "good" | "bad" | "progress";
  label: string;
};

const GROUPS: ActivityGroup[] = ["study", "club", "life", "training"];

export function isActivityGroup(value: string): value is ActivityGroup {
  return (GROUPS as string[]).includes(value);
}

export function isWeekGoalScope(value: string): value is WeekGoalScope {
  return value === "week" || isActivityGroup(value) || value.trim().length > 0;
}

export function weekGoalId(scope: WeekGoalScope, direction: GoalDirection): string {
  return `week-goal-${scope}-${direction}`;
}

export function scopeLabel(scope: WeekGoalScope, activities: Activity[]): string {
  if (scope === "week") return "Whole week";
  if (isActivityGroup(scope)) {
    if (scope === "study") return "Study (all classes)";
    if (scope === "club") return "Clubs";
    if (scope === "life") return "Everything else";
    return "Gym time";
  }
  return activities.find((activity) => activity.id === scope)?.label ?? scope;
}

export function actualMsForScope(
  scope: WeekGoalScope,
  totalsByActivity: Record<string, number>,
  activities: Activity[],
  weekTotal: number,
): number {
  if (scope === "week") return weekTotal;
  if (isActivityGroup(scope)) {
    return activities
      .filter((activity) => activity.group === scope)
      .reduce((sum, activity) => sum + (totalsByActivity[activity.id] ?? 0), 0);
  }
  return totalsByActivity[scope] ?? 0;
}

export function evaluateWeekGoal(
  goal: WeekGoal,
  totalsByActivity: Record<string, number>,
  activities: Activity[],
  weekTotal: number,
): WeekGoalStatus {
  const targetMs = Math.max(0, goal.targetHours) * 3_600_000;
  const actualMs = actualMsForScope(goal.scope, totalsByActivity, activities, weekTotal);
  const met =
    goal.direction === "aim-up" ? actualMs >= targetMs : actualMs < targetMs || targetMs === 0;
  const overCap = goal.direction === "cap" && actualMs >= targetMs && targetMs > 0;
  const tone: WeekGoalStatus["tone"] = overCap ? "bad" : met ? "good" : "progress";
  const label = scopeLabel(goal.scope, activities);
  return { goal, actualMs, targetMs, met, tone, label };
}

export function weekGoalInsight(status: WeekGoalStatus): string {
  const actual = formatCompact(status.actualMs);
  const target = `${status.goal.targetHours}h`;
  if (status.goal.direction === "aim-up") {
    return status.met
      ? `${status.label}: ${actual} / ${target} — hit`
      : `${status.label}: ${actual} / ${target} — still short`;
  }
  return status.tone === "bad"
    ? `${status.label}: ${actual} (cap ${target}) — over`
    : `${status.label}: ${actual} under ${target} cap`;
}

export const DEFAULT_WEEK_GOALS: WeekGoal[] = [
  {
    id: weekGoalId("study", "aim-up"),
    scope: "study",
    targetHours: 10,
    direction: "aim-up",
  },
  {
    id: weekGoalId("youtube", "cap"),
    scope: "youtube",
    targetHours: 10,
    direction: "cap",
  },
];
