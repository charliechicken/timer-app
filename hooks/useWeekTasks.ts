"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebase";
import { getOwnerId } from "@/lib/owner";
import { deleteWeekTask, saveWeekTask, subscribeWeekTasks } from "@/lib/taskStorage";
import { dateKey } from "@/lib/time";
import { applyOrder, rankTasks, type WeekTask } from "@/lib/tasks";

export function useWeekTasks(firebaseUid: string | null, weekStart: Date) {
  const usingFirebase = isFirebaseConfigured();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<WeekTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const weekKey = dateKey(weekStart);

  useEffect(() => {
    if (usingFirebase) {
      setOwnerId(firebaseUid);
      return;
    }
    setOwnerId(getOwnerId());
  }, [firebaseUid, usingFirebase]);

  useEffect(() => {
    if (!ownerId) return;
    return subscribeWeekTasks(ownerId, setTasks, setError);
  }, [ownerId]);

  const weekTasks = useMemo(
    () => rankTasks(tasks.filter((task) => task.weekKey === weekKey)),
    [tasks, weekKey],
  );

  const persistRanks = useCallback(
    async (next: WeekTask[]) => {
      if (!ownerId) return;
      const ranked = applyOrder(next);
      setTasks((current) => {
        const kept = current.filter((task) => !ranked.some((item) => item.id === task.id));
        return [...kept, ...ranked];
      });
      await Promise.all(ranked.map((task) => saveWeekTask(ownerId, task)));
    },
    [ownerId],
  );

  const addTask = useCallback(
    async (title: string, dueKey: string) => {
      if (!ownerId || !title.trim()) return;
      const task: WeekTask = {
        id: crypto.randomUUID(),
        title: title.trim(),
        dueKey,
        weekKey,
        priority: weekTasks.length + 1,
        done: false,
        createdAt: Date.now(),
      };
      await saveWeekTask(ownerId, task);
    },
    [ownerId, weekKey, weekTasks.length],
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Pick<WeekTask, "title" | "dueKey" | "done">>) => {
      if (!ownerId) return;
      const current = weekTasks.find((task) => task.id === id);
      if (!current) return;
      await saveWeekTask(ownerId, { ...current, ...patch });
    },
    [ownerId, weekTasks],
  );

  const commitOrder = useCallback(
    async (next: WeekTask[]) => {
      await persistRanks(next);
    },
    [persistRanks],
  );

  const removeTask = useCallback(
    async (id: string) => {
      if (!ownerId) return;
      await deleteWeekTask(ownerId, id);
      await persistRanks(weekTasks.filter((task) => task.id !== id));
    },
    [ownerId, persistRanks, weekTasks],
  );

  return { weekTasks, error, addTask, updateTask, commitOrder, removeTask };
}
