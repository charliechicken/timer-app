"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BODY_PARTS,
  DEFAULT_GOALS,
  EXERCISE_MAP,
  bestSet,
  epley1RM,
  relativeScore,
  type BodyPart,
  type GymDay,
  type GymGoal,
  type GymLog,
  type GymSet,
  type SplitType,
} from "@/lib/gym";
import {
  logId,
  saveGymDay,
  saveGymGoal,
  saveGymLog,
  seedDefaultGoals,
  subscribeGymDays,
  subscribeGymGoals,
  subscribeGymLogs,
} from "@/lib/gymStorage";
import { getOwnerId } from "@/lib/owner";
import { isFirebaseConfigured } from "@/lib/firebase";
import { addDays, dateKey, startOfWeek } from "@/lib/time";

export function useGym(firebaseUid: string | null) {
  const usingFirebase = isFirebaseConfigured();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [logs, setLogs] = useState<GymLog[]>([]);
  const [days, setDays] = useState<GymDay[]>([]);
  const [goals, setGoals] = useState<GymGoal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (usingFirebase) {
      setOwnerId(firebaseUid);
      return;
    }
    setOwnerId(getOwnerId());
  }, [firebaseUid, usingFirebase]);

  useEffect(() => {
    if (!ownerId) return;
    const unsubLogs = subscribeGymLogs(ownerId, setLogs, setError);
    const unsubDays = subscribeGymDays(ownerId, setDays, setError);
    const unsubGoals = subscribeGymGoals(
      ownerId,
      (next) => {
        setGoals(next);
        if (!seeded.current) {
          seeded.current = true;
          void seedDefaultGoals(ownerId, next);
        }
      },
      setError,
    );
    return () => {
      unsubLogs();
      unsubDays();
      unsubGoals();
    };
  }, [ownerId]);

  const saveSplit = useCallback(
    async (split: SplitType, when = new Date()) => {
      if (!ownerId) return;
      const key = dateKey(when);
      await saveGymDay(ownerId, {
        id: key,
        dateKey: key,
        split,
        startedAt: Date.now(),
      });
    },
    [ownerId],
  );

  const saveSets = useCallback(
    async (exerciseId: GymLog["exerciseId"], sets: [GymSet, GymSet], split: SplitType) => {
      if (!ownerId) return;
      const key = dateKey();
      await saveGymLog(ownerId, {
        id: logId(key, exerciseId),
        exerciseId,
        split,
        loggedAt: Date.now(),
        dateKey: key,
        sets,
      });
    },
    [ownerId],
  );

  const upsertGoal = useCallback(
    async (goal: GymGoal) => {
      if (!ownerId) return;
      await saveGymGoal(ownerId, goal);
    },
    [ownerId],
  );

  const weekStart = startOfWeek();
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const setsByBodyPart = useMemo(() => {
    const start = weekStart.getTime();
    const end = addDays(weekStart, 7).getTime();
    const totals = Object.fromEntries(BODY_PARTS.map((part) => [part, 0])) as Record<
      BodyPart,
      number
    >;
    for (const log of logs) {
      if (log.loggedAt < start || log.loggedAt >= end) continue;
      const exercise = EXERCISE_MAP[log.exerciseId];
      const completed = log.sets.filter((set) => set.weight > 0 || set.reps > 0).length;
      totals[exercise.bodyPart] += completed;
    }
    return totals;
  }, [logs, weekStart]);

  return {
    ownerId,
    error,
    logs,
    days,
    goals: goals.length ? goals : DEFAULT_GOALS,
    weekDays,
    setsByBodyPart,
    saveSplit,
    saveSets,
    upsertGoal,
  };
}
