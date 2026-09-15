"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ACTIVITIES } from "@/lib/activities";
import { isFirebaseConfigured } from "@/lib/firebase";
import { getOwnerId } from "@/lib/owner";
import {
  commitSessions,
  migrateLocalSessionsIfNeeded,
  subscribeSessions,
} from "@/lib/storage";
import { addDays, overlapMs, startOfWeek } from "@/lib/time";
import type { ActivityId, Session } from "@/lib/types";

const STALE_MS = 8 * 60 * 60 * 1000;

export function useWeekTimer(firebaseUid: string | null) {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  });
  const migrated = useRef(false);
  const pending = useRef(false);
  const usingFirebase = isFirebaseConfigured();

  useEffect(() => {
    if (usingFirebase) {
      setOwnerId(firebaseUid);
      if (!firebaseUid) {
        setSessions([]);
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
    return unsubscribe;
  }, [ownerId, usingFirebase]);

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
    return () => window.clearInterval(id);
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
    const totals = Object.fromEntries(ACTIVITIES.map((activity) => [activity.id, 0])) as Record<
      ActivityId,
      number
    >;
    for (const session of sessions) {
      const duration = durationFor(session, weekStart.getTime(), weekEnd.getTime());
      totals[session.activityId] += duration;
    }
    return totals;
  }, [durationFor, sessions, weekEnd, weekStart]);

  const totalsByDay = useMemo(() => {
    return days.map((day) => {
      const dayStart = day.getTime();
      const dayEnd = addDays(day, 1).getTime();
      const byActivity = Object.fromEntries(
        ACTIVITIES.map((activity) => [activity.id, 0]),
      ) as Record<ActivityId, number>;
      let total = 0;
      for (const session of sessions) {
        const duration = durationFor(session, dayStart, dayEnd);
        byActivity[session.activityId] += duration;
        total += duration;
      }
      return { date: day, total, byActivity };
    });
  }, [days, durationFor, sessions]);

  const weekTotal = useMemo(
    () => Object.values(totalsByActivity).reduce((sum, value) => sum + value, 0),
    [totalsByActivity],
  );

  const groupTotal = useCallback(
    (group: (typeof ACTIVITIES)[number]["group"]) =>
      ACTIVITIES.filter((activity) => activity.group === group).reduce(
        (sum, activity) => sum + totalsByActivity[activity.id],
        0,
      ),
    [totalsByActivity],
  );

  const studyTotal = groupTotal("study");
  const clubTotal = groupTotal("club");
  const lifeTotal = groupTotal("life");

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
    async (activityId: ActivityId) => {
      if (!ownerId || pending.current) return;
      pending.current = true;
      const timestamp = Date.now();
      setNow(timestamp);
      const running = sessions.filter((session) => session.endAt === null);
      const alreadyOnThis = running.some((session) => session.activityId === activityId);
      const stopped = running.map((session) => ({ ...session, endAt: timestamp }));
      const nextSession = alreadyOnThis
        ? null
        : {
            id: crypto.randomUUID(),
            activityId,
            startAt: timestamp,
            endAt: null,
          };
      const withoutRunning = sessions.map((session) =>
        session.endAt === null ? { ...session, endAt: timestamp } : session,
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
    const stopped = { ...activeSession, endAt: Date.now() };
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

  const remove = useCallback(
    async (sessionId: string) => {
      if (!ownerId) return;
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

  return {
    ownerId: ownerId ?? "…",
    ready,
    usingFirebase,
    syncError,
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
    totalsByActivity,
    totalsByDay,
    weekTotal,
    studyTotal,
    clubTotal,
    lifeTotal,
    previousWeekTotal,
    sessionCount,
    busiestDay,
    isCompleteWeek,
    isWeekEnding,
    activeSession,
    stale,
    start,
    stop,
    remove,
    durationFor,
  };
}
