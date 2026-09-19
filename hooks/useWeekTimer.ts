"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  colorForActivityId,
  emptyTotals,
  mergeActivityCatalog,
  resolveActivity,
  shortLabelFrom,
  slugActivityId,
  visibleActivities,
  type Activity,
  type ActivityGroup,
} from "@/lib/activities";
import { saveActivity, subscribeActivities } from "@/lib/activityStorage";
import { isFirebaseConfigured } from "@/lib/firebase";
import { getOwnerId } from "@/lib/owner";
import {
  commitSessions,
  migrateLocalSessionsIfNeeded,
  subscribeSessions,
} from "@/lib/storage";
import {
  emailTimerComplete,
  playTimerSound,
  showTimerNotification,
} from "@/lib/alerts";
import { addDays, overlapMs, startOfWeek } from "@/lib/time";
import { placeManualSessions } from "@/lib/placeSessions";
import type { ActivityId, Session } from "@/lib/types";

const STALE_MS = 8 * 60 * 60 * 1000;

export function useWeekTimer(
  firebaseUid: string | null,
  notifyEmail?: string | null,
  enableAlerts = false,
) {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [storedActivities, setStoredActivities] = useState<Activity[]>([]);
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  });
  const migrated = useRef(false);
  const pending = useRef(false);
  const lastDeleted = useRef<Session[]>([]);
  const completing = useRef<string | null>(null);
  const [undoCount, setUndoCount] = useState(0);
  const usingFirebase = isFirebaseConfigured();

  useEffect(() => {
    if (usingFirebase) {
      setOwnerId(firebaseUid);
      if (!firebaseUid) {
        setSessions([]);
        setStoredActivities([]);
        setReady(false);
      }
      return;
    }
    setOwnerId(getOwnerId());
  }, [firebaseUid, usingFirebase]);

  useEffect(() => {
    if (!ownerId) return;
    const unsubscribe = subscribeSessions(
      ownerId,
      (next) => {
        setSessions(next);
        setReady(true);
        setSyncError(null);
        if (!migrated.current && usingFirebase) {
          migrated.current = true;
          void migrateLocalSessionsIfNeeded(ownerId, next);
        }
      },
      (message) => {
        setSyncError(message);
        setReady(true);
      },
    );
    const unsubActivities = subscribeActivities(
      ownerId,
      setStoredActivities,
      (message) => setSyncError(message),
    );
    return () => {
      unsubscribe();
      unsubActivities();
    };
  }, [ownerId, usingFirebase]);

  const activities = useMemo(
    () => mergeActivityCatalog(storedActivities),
    [storedActivities],
  );
  const visible = useMemo(() => visibleActivities(activities), [activities]);

  const activeSession = useMemo(
    () =>
      sessions
        .filter((session) => session.endAt === null)
        .sort((a, b) => b.startAt - a.startAt)[0] ?? null,
    [sessions],
  );

  useEffect(() => {
    if (!activeSession) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [activeSession]);

  const weekStart = useMemo(() => startOfWeek(new Date(), weekOffset), [weekOffset]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const goToWeek = useCallback((offset: number) => {
    setWeekOffset(Math.min(0, offset));
    if (offset === 0) {
      const day = new Date().getDay();
      setSelectedDayIndex(day === 0 ? 6 : day - 1);
      return;
    }
    setSelectedDayIndex(0);
  }, []);

  const durationFor = useCallback(
    (session: Session, rangeStart: number, rangeEnd: number) =>
      overlapMs(session.startAt, session.endAt ?? now, rangeStart, rangeEnd),
    [now],
  );

  const totalsByActivity = useMemo(() => {
    const totals = emptyTotals(activities);
    for (const session of sessions) {
      const duration = durationFor(session, weekStart.getTime(), weekEnd.getTime());
      totals[session.activityId] = (totals[session.activityId] ?? 0) + duration;
    }
    return totals;
  }, [activities, durationFor, sessions, weekEnd, weekStart]);

  const totalsByDay = useMemo(() => {
    return days.map((day) => {
      const dayStart = day.getTime();
      const dayEnd = addDays(day, 1).getTime();
      const byActivity = emptyTotals(activities);
      let total = 0;
      for (const session of sessions) {
        const duration = durationFor(session, dayStart, dayEnd);
        byActivity[session.activityId] = (byActivity[session.activityId] ?? 0) + duration;
        total += duration;
      }
      return { date: day, total, byActivity };
    });
  }, [activities, days, durationFor, sessions]);

  const weekTotal = useMemo(
    () => Object.values(totalsByActivity).reduce((sum, value) => sum + value, 0),
    [totalsByActivity],
  );

  const groupTotal = useCallback(
    (group: ActivityGroup) =>
      activities
        .filter((activity) => activity.group === group)
        .reduce((sum, activity) => sum + (totalsByActivity[activity.id] ?? 0), 0),
    [activities, totalsByActivity],
  );

  const studyTotal = groupTotal("study");
  const clubTotal = groupTotal("club");
  const lifeTotal = groupTotal("life");
  const gymTotal = groupTotal("training");

  const previousWeekStart = useMemo(
    () => startOfWeek(new Date(), weekOffset - 1),
    [weekOffset],
  );
  const previousWeekTotal = useMemo(() => {
    const rangeStart = previousWeekStart.getTime();
    const rangeEnd = addDays(previousWeekStart, 7).getTime();
    return sessions.reduce(
      (sum, session) => sum + durationFor(session, rangeStart, rangeEnd),
      0,
    );
  }, [durationFor, previousWeekStart, sessions]);

  const sessionCount = useMemo(() => {
    const rangeStart = weekStart.getTime();
    const rangeEnd = weekEnd.getTime();
    return sessions.filter(
      (session) => durationFor(session, rangeStart, rangeEnd) > 0,
    ).length;
  }, [durationFor, sessions, weekEnd, weekStart]);

  const busiestDay = useMemo(() => {
    return totalsByDay.reduce(
      (best, day) => (day.total > best.total ? day : best),
      totalsByDay[0] ?? { date: weekStart, total: 0, byActivity: totalsByActivity },
    );
  }, [totalsByActivity, totalsByDay, weekStart]);

  const isCompleteWeek = weekOffset < 0;
  const isWeekEnding = weekOffset === 0 && new Date().getDay() === 0;

  const selectedDay = days[selectedDayIndex] ?? days[0];
  const selectedDaySessions = useMemo(() => {
    if (!selectedDay) return [];
    const dayStart = selectedDay.getTime();
    const dayEnd = addDays(selectedDay, 1).getTime();
    return sessions
      .filter((session) => {
        const startedToday = session.startAt >= dayStart && session.startAt < dayEnd;
        return startedToday || durationFor(session, dayStart, dayEnd) > 0;
      })
      .sort((a, b) => b.startAt - a.startAt);
  }, [durationFor, selectedDay, sessions]);

  const stale = Boolean(activeSession && now - activeSession.startAt >= STALE_MS);

  const start = useCallback(
    async (activityId: ActivityId, durationMs?: number) => {
      if (!ownerId || pending.current) return;
      pending.current = true;
      const timestamp = Date.now();
      setNow(timestamp);
      const running = sessions.filter((session) => session.endAt === null);
      const alreadyOnThis =
        !durationMs && running.some((session) => session.activityId === activityId);
      const stopped = running.map((session) => ({
        ...session,
        endAt: timestamp,
        targetEndAt: session.targetEndAt ?? null,
      }));
      const nextSession = alreadyOnThis
        ? null
        : {
            id: crypto.randomUUID(),
            activityId,
            startAt: timestamp,
            endAt: null,
            targetEndAt: durationMs ? timestamp + durationMs : null,
            manual: false,
          };
      const withoutRunning = sessions.map((session) =>
        session.endAt === null
          ? { ...session, endAt: timestamp, targetEndAt: session.targetEndAt ?? null }
          : session,
      );
      const next = nextSession ? [nextSession, ...withoutRunning] : withoutRunning;
      const upserts = [...stopped, ...(nextSession ? [nextSession] : [])];

      setSessions(next);

      try {
        await commitSessions(ownerId, next, upserts);
        setSyncError(null);
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : "Could not save");
      } finally {
        pending.current = false;
      }
    },
    [ownerId, sessions],
  );

  const stop = useCallback(async () => {
    if (!ownerId || !activeSession || pending.current) return;
    pending.current = true;
    const stopped = {
      ...activeSession,
      endAt: Date.now(),
      targetEndAt: activeSession.targetEndAt ?? null,
    };
    const next = sessions.map((session) => (session.id === stopped.id ? stopped : session));
    setSessions(next);
    try {
      await commitSessions(ownerId, next, [stopped]);
      setSyncError(null);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Could not save");
    } finally {
      pending.current = false;
    }
  }, [activeSession, ownerId, sessions]);

  const addTime = useCallback(
    async (
      activityId: ActivityId,
      durationMs: number,
      options?: { startAt?: number; spread?: boolean },
    ) => {
      if (!ownerId || durationMs <= 0) return;
      const day = selectedDay ?? new Date();
      const placed = placeManualSessions({
        activityId,
        durationMs,
        day,
        existing: sessions,
        startAt: options?.startAt,
        spread: options?.spread,
      });
      if (!placed.length) return;
      const next = [...placed, ...sessions];
      setSessions(next);
      try {
        await commitSessions(ownerId, next, placed);
        setSyncError(null);
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : "Could not save");
      }
    },
    [ownerId, selectedDay, sessions],
  );

  const remove = useCallback(
    async (sessionId: string) => {
      if (!ownerId) return;
      const removed = sessions.find((session) => session.id === sessionId);
      if (!removed) return;
      lastDeleted.current = [...lastDeleted.current, removed];
      setUndoCount(lastDeleted.current.length);
      const next = sessions.filter((session) => session.id !== sessionId);
      setSessions(next);
      try {
        await commitSessions(ownerId, next, [], [sessionId]);
        setSyncError(null);
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : "Could not save");
      }
    },
    [ownerId, sessions],
  );

  const undoRemove = useCallback(async () => {
    if (!ownerId) return;
    const restored = lastDeleted.current.pop();
    setUndoCount(lastDeleted.current.length);
    if (!restored) return;
    const next = [restored, ...sessions.filter((session) => session.id !== restored.id)];
    setSessions(next);
    try {
      await commitSessions(ownerId, next, [restored]);
      setSyncError(null);
    } catch (error) {
      lastDeleted.current.push(restored);
      setUndoCount(lastDeleted.current.length);
      setSyncError(error instanceof Error ? error.message : "Could not save");
    }
  }, [ownerId, sessions]);

  useEffect(() => {
    if (!enableAlerts) return;
    const targetEndAt = activeSession?.targetEndAt;
    if (!activeSession || !targetEndAt) return;
    if (now < targetEndAt) return;
    if (completing.current === activeSession.id) return;
    completing.current = activeSession.id;
    const session = activeSession;
    const minutes = Math.max(1, Math.round((targetEndAt - session.startAt) / 60_000));
    const label = resolveActivity(session.activityId, activities).label;
    pending.current = false;
    void (async () => {
      await stop();
      try {
        playTimerSound();
        await showTimerNotification(session.activityId, minutes, label);
        if (notifyEmail) {
          const result = await emailTimerComplete({
            email: notifyEmail,
            activityId: session.activityId,
            minutes,
            activityLabel: label,
          });
          if (result.pendingConfirm) {
            setEmailNotice(
              `Check ${notifyEmail} and confirm the first email so timer alerts can arrive.`,
            );
          } else if (!result.ok) {
            setEmailNotice(result.error ?? "Could not send the timer email.");
          } else {
            setEmailNotice(`Emailed ${notifyEmail} that ${minutes}m is done.`);
          }
        }
      } catch {
        // Sound/notification/email should not block stopping the timer.
      }
    })();
  }, [activeSession, activities, enableAlerts, now, notifyEmail, stop]);

  const createActivity = useCallback(
    async (input: { label: string; group?: ActivityGroup; color?: string }) => {
      if (!ownerId) return null;
      const label = input.label.trim();
      if (!label) return null;
      const existing = activities.find(
        (activity) =>
          activity.custom &&
          activity.label.toLowerCase() === label.toLowerCase() &&
          activity.group === (input.group ?? "life"),
      );
      if (existing?.archived) {
        const restored = { ...existing, archived: false };
        await saveActivity(ownerId, restored);
        return restored;
      }
      if (existing && !existing.archived) return existing;
      const activity: Activity = {
        id: slugActivityId(label),
        label,
        shortLabel: shortLabelFrom(label),
        group: input.group ?? "life",
        color: input.color ?? colorForActivityId(label),
        custom: true,
        archived: false,
      };
      await saveActivity(ownerId, activity);
      return activity;
    },
    [activities, ownerId],
  );

  const archiveActivity = useCallback(
    async (activityId: ActivityId) => {
      if (!ownerId) return;
      const current = activities.find((activity) => activity.id === activityId);
      if (!current?.custom) return;
      await saveActivity(ownerId, { ...current, archived: true });
    },
    [activities, ownerId],
  );

  return {
    ownerId: ownerId ?? "…",
    ready,
    usingFirebase,
    syncError,
    emailNotice,
    now,
    weekOffset,
    goToWeek,
    weekStart,
    weekEnd,
    days,
    selectedDayIndex,
    setSelectedDayIndex,
    selectedDay,
    selectedDaySessions,
    sessions,
    activities,
    visibleActivities: visible,
    totalsByActivity,
    totalsByDay,
    weekTotal,
    studyTotal,
    clubTotal,
    lifeTotal,
    gymTotal,
    previousWeekTotal,
    sessionCount,
    busiestDay,
    isCompleteWeek,
    isWeekEnding,
    activeSession,
    stale,
    start,
    stop,
    addTime,
    remove,
    undoRemove,
    undoCount,
    durationFor,
    createActivity,
    archiveActivity,
  };
}
