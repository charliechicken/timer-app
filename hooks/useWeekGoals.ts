"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Activity } from "@/lib/activities";
import { isFirebaseConfigured } from "@/lib/firebase";
import { getOwnerId } from "@/lib/owner";
import {
  deleteWeekGoal,
  saveWeekGoal,
  subscribeWeekGoals,
} from "@/lib/weekGoalStorage";
import {
  DEFAULT_WEEK_GOALS,
  evaluateWeekGoal,
  weekGoalId,
  type GoalDirection,
  type WeekGoal,
  type WeekGoalScope,
} from "@/lib/weekGoals";

export function useWeekGoals(
  firebaseUid: string | null,
  totalsByActivity: Record<string, number>,
  activities: Activity[],
  weekTotal: number,
) {
  const usingFirebase = isFirebaseConfigured();
  const ownerId = useMemo(() => {
    if (usingFirebase) return firebaseUid;
    if (typeof window === "undefined") return null;
    return getOwnerId();
  }, [firebaseUid, usingFirebase]);
  const [stored, setStored] = useState<WeekGoal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (!ownerId) return;
    return subscribeWeekGoals(ownerId, setStored, setError);
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId || stored === null || seeded.current) return;
    seeded.current = true;
    if (stored.length > 0) return;
    void Promise.all(DEFAULT_WEEK_GOALS.map((goal) => saveWeekGoal(ownerId, goal)));
  }, [ownerId, stored]);

  const goals = useMemo(() => stored ?? [], [stored]);

  const statuses = useMemo(
    () =>
      goals.map((goal) =>
        evaluateWeekGoal(goal, totalsByActivity, activities, weekTotal),
      ),
    [activities, goals, totalsByActivity, weekTotal],
  );

  const upsertGoal = useCallback(
    async (input: {
      scope: WeekGoalScope;
      targetHours: number;
      direction: GoalDirection;
    }) => {
      if (!ownerId) return;
      const goal: WeekGoal = {
        id: weekGoalId(input.scope, input.direction),
        scope: input.scope,
        targetHours: input.targetHours,
        direction: input.direction,
      };
      await saveWeekGoal(ownerId, goal);
    },
    [ownerId],
  );

  const removeGoal = useCallback(
    async (id: string) => {
      if (!ownerId) return;
      await deleteWeekGoal(ownerId, id);
    },
    [ownerId],
  );

  return { goals, statuses, error, upsertGoal, removeGoal };
}
