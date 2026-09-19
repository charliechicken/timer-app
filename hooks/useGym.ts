"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BODY_PARTS,
  DEFAULT_GOALS,
  EXERCISES,
  bestSet,
  catalogMap,
  completedSets,
  epley1RM,
  mergeExerciseCatalog,
  slugExerciseId,
  visibleExercises,
  type BodyPart,
  type Exercise,
  type GymDay,
  type GymGoal,
  type GymLog,
  type GymSet,
  type SplitType,
} from "@/lib/gym";
import {
  logId,
  saveGymDay,
  saveGymExercise,
  saveGymGoal,
  saveGymLog,
  seedDefaultGoals,
  subscribeGymDays,
  subscribeGymExercises,
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
  const [storedExercises, setStoredExercises] = useState<Exercise[]>([]);
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
    const unsubExercises = subscribeGymExercises(ownerId, setStoredExercises, setError);
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
      unsubExercises();
    };
  }, [ownerId]);

  const exercises = useMemo(
    () => mergeExerciseCatalog(storedExercises),
    [storedExercises],
  );
  const exerciseLookup = useMemo(() => catalogMap(exercises), [exercises]);

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
    async (exerciseId: string, sets: GymSet[], split: SplitType) => {
      if (!ownerId) return;
      const key = dateKey();
      await saveGymLog(ownerId, {
        id: logId(key, exerciseId),
        exerciseId,
        split,
        loggedAt: Date.now(),
        dateKey: key,
        sets: sets.length ? sets : [{ weight: 0, reps: 0 }],
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

  const upsertExercise = useCallback(
    async (exercise: Exercise) => {
      if (!ownerId) return;
      await saveGymExercise(ownerId, exercise);
    },
    [ownerId],
  );

  const createExercise = useCallback(
    async (input: {
      label: string;
      split: SplitType;
      bodyPart: BodyPart;
      overloadReps: number;
    }) => {
      if (!ownerId) return { restored: false as const };
      const label = input.label.trim();
      const existing = exercises.find(
        (item) =>
          item.split === input.split &&
          item.label.toLowerCase() === label.toLowerCase(),
      );
      if (existing?.archived) {
        const inSplit = visibleExercises(exercises, input.split);
        const maxOrder = Math.max(0, ...inSplit.map((item) => item.sortOrder ?? 0));
        await saveGymExercise(ownerId, {
          ...existing,
          bodyPart: input.bodyPart,
          overloadReps: input.overloadReps,
          sortOrder: maxOrder + 10,
          archived: false,
        });
        return { restored: true as const, label: existing.label };
      }
      if (existing && !existing.archived) {
        return { restored: false as const, alreadyActive: true as const };
      }
      const inSplit = visibleExercises(exercises, input.split);
      const maxOrder = Math.max(0, ...inSplit.map((item) => item.sortOrder ?? 0));
      await saveGymExercise(ownerId, {
        id: slugExerciseId(label),
        label,
        split: input.split,
        bodyPart: input.bodyPart,
        overloadReps: input.overloadReps,
        sortOrder: maxOrder + 10,
        custom: true,
        archived: false,
      });
      return { restored: false as const };
    },
    [exercises, ownerId],
  );

  const archiveExercise = useCallback(
    async (exerciseId: string) => {
      if (!ownerId) return;
      const current =
        exercises.find((item) => item.id === exerciseId) ??
        EXERCISES.find((item) => item.id === exerciseId);
      if (!current) return;
      await saveGymExercise(ownerId, { ...current, archived: true });
    },
    [exercises, ownerId],
  );

  const restoreExercise = useCallback(
    async (exerciseId: string) => {
      if (!ownerId) return;
      const current =
        exercises.find((item) => item.id === exerciseId) ??
        EXERCISES.find((item) => item.id === exerciseId);
      if (!current) return;
      const inSplit = visibleExercises(exercises, current.split);
      const maxOrder = Math.max(0, ...inSplit.map((item) => item.sortOrder ?? 0));
      await saveGymExercise(ownerId, {
        ...current,
        sortOrder: maxOrder + 10,
        archived: false,
      });
    },
    [exercises, ownerId],
  );

  const reorderExercises = useCallback(
    async (split: SplitType, orderedIds: string[]) => {
      if (!ownerId) return;
      await Promise.all(
        orderedIds.map((id, index) => {
          const current = exercises.find((item) => item.id === id);
          if (!current) return Promise.resolve();
          return saveGymExercise(ownerId, { ...current, sortOrder: index * 10, archived: false });
        }),
      );
    },
    [exercises, ownerId],
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
      const exercise = exerciseLookup[log.exerciseId];
      if (!exercise) continue;
      totals[exercise.bodyPart] += completedSets(log.sets).length;
    }
    return totals;
  }, [exerciseLookup, logs, weekStart]);

  return {
    ownerId,
    error,
    logs,
    days,
    exercises,
    exerciseLookup,
    goals: goals.length ? goals : DEFAULT_GOALS,
    weekDays,
    setsByBodyPart,
    bestSet,
    epley1RM,
    saveSplit,
    saveSets,
    upsertGoal,
    upsertExercise,
    createExercise,
    archiveExercise,
    restoreExercise,
    reorderExercises,
  };
}
