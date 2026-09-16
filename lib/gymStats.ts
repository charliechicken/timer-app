import {
  BODY_PARTS,
  bestSet,
  completedSets,
  emaSeries,
  epley1RM,
  exerciseLabel,
  type BodyPart,
  type Exercise,
  type GymDay,
  type GymLog,
} from "./gym";
import { addDays, formatCompact, formatWeekRange, startOfWeek } from "./time";
import type { Session } from "./types";

export type LiftPoint = {
  t: number;
  dateKey: string;
  y: number;
  weight: number;
  reps: number;
  label: string;
  improved: boolean;
};

export type LiftSeries = {
  exerciseId: string;
  label: string;
  color: string;
  points: LiftPoint[];
  ema: number[];
};

export function sessionPoints(logs: GymLog[], exerciseId: string): LiftPoint[] {
  return logs
    .filter((log) => log.exerciseId === exerciseId)
    .sort((a, b) => a.loggedAt - b.loggedAt)
    .map((log, index, all) => {
      const set = bestSet(completedSets(log.sets));
      const y = epley1RM(set.weight, set.reps);
      const previous = all[index - 1]
        ? epley1RM(
            bestSet(completedSets(all[index - 1].sets)).weight,
            bestSet(completedSets(all[index - 1].sets)).reps,
          )
        : 0;
      return {
        t: log.loggedAt,
        dateKey: log.dateKey,
        y,
        weight: set.weight,
        reps: set.reps,
        label: `${set.weight} x ${set.reps}`,
        improved: index > 0 && y > previous + 0.05,
      };
    })
    .filter((point) => point.y > 0);
}

export function liftSeries(
  logs: GymLog[],
  exerciseId: string,
  exercises: Exercise[],
  color: string,
  from?: number,
): LiftSeries {
  const points = sessionPoints(logs, exerciseId).filter(
    (point) => from == null || point.t >= from,
  );
  return {
    exerciseId,
    label: exerciseLabel(exerciseId, exercises),
    color,
    points,
    ema: emaSeries(points.map((point) => point.y)),
  };
}

export type GymWeekStats = {
  weekStart: Date;
  rangeLabel: string;
  workoutDays: number;
  totalSets: number;
  totalGymMs: number;
  averageGymMs: number;
  liftCount: number;
  bodyPartSets: Record<BodyPart, number>;
  topLifts: { exerciseId: string; label: string; e1rm: number; setLabel: string }[];
  insight: string;
};

export function gymWeekStats(
  logs: GymLog[],
  days: GymDay[],
  sessions: Session[],
  exercises: Exercise[],
  weekStart = startOfWeek(),
): GymWeekStats {
  const start = weekStart.getTime();
  const end = addDays(weekStart, 7).getTime();
  const weekLogs = logs.filter((log) => log.loggedAt >= start && log.loggedAt < end);
  const workoutDays = new Set([
    ...days.filter((day) => day.startedAt >= start && day.startedAt < end).map((day) => day.dateKey),
    ...weekLogs.map((log) => log.dateKey),
  ]).size;
  const totalSets = weekLogs.reduce(
    (sum, log) => sum + completedSets(log.sets).length,
    0,
  );
  const totalGymMs = sessions.reduce((sum, session) => {
    if (session.activityId !== "gym") return sum;
    const sessionEnd = session.endAt ?? Date.now();
    return sum + Math.max(0, Math.min(sessionEnd, end) - Math.max(session.startAt, start));
  }, 0);
  const bodyPartSets = Object.fromEntries(BODY_PARTS.map((part) => [part, 0])) as Record<
    BodyPart,
    number
  >;
  const bestByLift = new Map<string, { e1rm: number; setLabel: string }>();
  for (const log of weekLogs) {
    const exercise = exercises.find((item) => item.id === log.exerciseId);
    if (exercise) bodyPartSets[exercise.bodyPart] += completedSets(log.sets).length;
    const set = bestSet(completedSets(log.sets));
    const e1rm = epley1RM(set.weight, set.reps);
    if (e1rm <= 0) continue;
    const current = bestByLift.get(log.exerciseId);
    if (!current || e1rm > current.e1rm) {
      bestByLift.set(log.exerciseId, {
        e1rm,
        setLabel: `${set.weight} x ${set.reps}`,
      });
    }
  }
  const topLifts = [...bestByLift.entries()]
    .map(([exerciseId, row]) => ({
      exerciseId,
      label: exerciseLabel(exerciseId, exercises),
      e1rm: row.e1rm,
      setLabel: row.setLabel,
    }))
    .sort((a, b) => b.e1rm - a.e1rm)
    .slice(0, 8);

  const insight = !weekLogs.length
    ? "No lifts logged this week yet."
    : [
        `${workoutDays} workout day${workoutDays === 1 ? "" : "s"} and ${totalSets} sets.`,
        totalGymMs ? `Gym time ${formatCompact(totalGymMs)}.` : null,
        topLifts[0]
          ? `Best Epley this week: ${topLifts[0].label} at ${topLifts[0].setLabel} (e1RM ${topLifts[0].e1rm.toFixed(1)} lb).`
          : null,
      ]
        .filter(Boolean)
        .join(" ");

  return {
    weekStart,
    rangeLabel: formatWeekRange(weekStart),
    workoutDays,
    totalSets,
    totalGymMs,
    averageGymMs: workoutDays ? totalGymMs / workoutDays : 0,
    liftCount: bestByLift.size,
    bodyPartSets,
    topLifts,
    insight,
  };
}

export function gymWeekEmail(stats: GymWeekStats): { subject: string; text: string } {
  const lines = [
    `Gym week ${stats.rangeLabel}`,
    "",
    stats.insight,
    `Workout days: ${stats.workoutDays}`,
    `Total sets: ${stats.totalSets}`,
    `Gym time: ${formatCompact(stats.totalGymMs)}`,
    `Average time / workout: ${stats.workoutDays ? formatCompact(stats.averageGymMs) : "—"}`,
    `Lifts trained: ${stats.liftCount}`,
    "",
    "Best lifts (Epley e1RM)",
    ...stats.topLifts.map(
      (lift) => `- ${lift.label}: ${lift.setLabel} → ${lift.e1rm.toFixed(1)} lb`,
    ),
  ];
  return {
    subject: `Gym report · ${stats.rangeLabel}`,
    text: lines.join("\n"),
  };
}
