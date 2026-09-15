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

export function useWeekTimer() {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [ready, setReady] = useState(false);
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
    setOwnerId(getOwnerId());
  }, []);

  useEffect(() => {
    if (!ownerId) return;
    const unsubscribe = subscribeSessions(ownerId, (next) => {
      setSessions(next);
      setReady(true);
      if (!migrated.current && usingFirebase) {
        migrated.current = true;
        void migrateLocalSessionsIfNeeded(ownerId, next);
      }
    });
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

  const classTotal = useMemo(
    () =>
      ACTIVITIES.filter((activity) => activity.group === "class").reduce(
        (sum, activity) => sum + totalsByActivity[activity.id],
        0,
      ),
    [totalsByActivity],
  );

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
    } finally {
      pending.current = false;
    }
  }, [activeSession, ownerId, sessions]);

  const remove = useCallback(
    async (sessionId: string) => {
      if (!ownerId) return;
      const next = sessions.filter((session) => session.id !== sessionId);
      setSessions(next);
      await commitSessions(ownerId, next, [], [sessionId]);
    },
    [ownerId, sessions],
  );

  return {
    ownerId: ownerId ?? "…",
    ready,
    usingFirebase,
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
    classTotal,
    activeSession,
    stale,
    start,
    stop,
    remove,
    durationFor,
  };
}
