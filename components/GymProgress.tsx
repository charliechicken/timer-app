"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGym } from "@/hooks/useGym";
import {
  EXERCISES,
  EXERCISE_MAP,
  bestSet,
  epley1RM,
  type ExerciseId,
} from "@/lib/gym";
import { addDays, startOfDay, startOfWeek } from "@/lib/time";
import { AppShell } from "./AppShell";

type Range = "week" | "month" | "3mo" | "6mo" | "year";

const RANGES: { id: Range; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "3mo", label: "3 months" },
  { id: "6mo", label: "6 months" },
  { id: "year", label: "Year" },
];

function rangeStart(range: Range): Date {
  const now = startOfDay();
  if (range === "week") return startOfWeek(now);
  if (range === "month") return addDays(now, -30);
  if (range === "3mo") return addDays(now, -90);
  if (range === "6mo") return addDays(now, -180);
  return addDays(now, -365);
}

export function GymProgress() {
  const auth = useAuth();
  const gym = useGym(auth.user?.uid ?? null);
  const [range, setRange] = useState<Range>("month");
  const [exerciseId, setExerciseId] = useState<ExerciseId>("barbell-bench-press");
  const [weight, setWeight] = useState("200");
  const [reps, setReps] = useState("5");

  const exercise = EXERCISE_MAP[exerciseId];
  const goal = gym.goals.find((item) => item.exerciseId === exerciseId);
  const from = rangeStart(range).getTime();

  const points = useMemo(() => {
    return gym.logs
      .filter((log) => log.exerciseId === exerciseId && log.loggedAt >= from)
      .sort((a, b) => a.loggedAt - b.loggedAt)
      .map((log) => {
        const set = bestSet(log.sets);
        return {
          t: log.loggedAt,
          y: epley1RM(set.weight, set.reps),
          label: `${set.weight} × ${set.reps}`,
        };
      });
  }, [exerciseId, from, gym.logs]);

  const goalY = goal ? epley1RM(goal.weight, goal.reps) : undefined;

  function handleGoal(event: FormEvent) {
    event.preventDefault();
    const nextWeight = Number(weight);
    const nextReps = Number(reps);
    if (!nextWeight || !nextReps) return;
    void gym.upsertGoal({
      id: goal?.id ?? `goal-${exerciseId}`,
      exerciseId,
      weight: nextWeight,
      reps: nextReps,
    });
  }

  return (
    <AppShell>
      <header className="topbar">
        <div>
          <p className="brand">Gym progress</p>
          <h2>{exercise.label}</h2>
        </div>
        <Link href="/gym" className="ghost">
          Back to gym
        </Link>
      </header>

      {gym.error ? <p className="sync-error">{gym.error}</p> : null}

      <section className="panel">
        <div className="panel-title">
          <h3>Every session</h3>
          <p>Estimated 1RM from the better of the two sets</p>
        </div>
        <div className="split-pick">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={range === item.id ? "stop" : "ghost"}
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="select-row">
          <span>Exercise</span>
          <select
            value={exerciseId}
            onChange={(event) => {
              const next = event.target.value as ExerciseId;
              setExerciseId(next);
              const nextGoal = gym.goals.find((item) => item.exerciseId === next);
              setWeight(String(nextGoal?.weight ?? ""));
              setReps(String(nextGoal?.reps ?? ""));
            }}
          >
            {EXERCISES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <SessionChart points={points} goal={goalY} goalLabel={goal ? `${goal.weight} × ${goal.reps}` : undefined} />
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>Goal for this lift</h3>
          <p>Saved to your signed-in account. Bench 200×5 and RDL 225×7 are already there.</p>
        </div>
        <form className="goal-form" onSubmit={handleGoal}>
          <label>
            <span>Weight</span>
            <input
              type="number"
              min="1"
              step="0.5"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
            />
          </label>
          <label>
            <span>Reps</span>
            <input
              type="number"
              min="1"
              step="1"
              value={reps}
              onChange={(event) => setReps(event.target.value)}
            />
          </label>
          <button type="submit" className="stop">
            Save goal
          </button>
        </form>
      </section>
    </AppShell>
  );
}

function SessionChart({
  points,
  goal,
  goalLabel,
}: {
  points: { t: number; y: number; label: string }[];
  goal?: number;
  goalLabel?: string;
}) {
  const width = 720;
  const height = 260;
  const pad = { l: 44, r: 16, t: 16, b: 28 };
  const ys = [...points.map((point) => point.y), ...(goal ? [goal] : []), 1];
  const minY = 0;
  const maxY = Math.max(...ys) * 1.1;
  const minX = points[0]?.t ?? Date.now();
  const maxX = points[points.length - 1]?.t ?? minX + 1;
  const spanX = Math.max(1, maxX - minX);

  const xOf = (t: number) => pad.l + ((t - minX) / spanX) * (width - pad.l - pad.r);
  const yOf = (y: number) => pad.t + (1 - (y - minY) / (maxY - minY)) * (height - pad.t - pad.b);
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xOf(point.t)} ${yOf(point.y)}`)
    .join(" ");

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="session-chart" role="img">
        {goal ? (
          <line
            x1={pad.l}
            x2={width - pad.r}
            y1={yOf(goal)}
            y2={yOf(goal)}
            className="goal-line"
          />
        ) : null}
        {path ? <path d={path} className="session-line" /> : null}
        {points.map((point) => (
          <circle key={point.t} cx={xOf(point.t)} cy={yOf(point.y)} r="5">
            <title>{`${new Date(point.t).toLocaleDateString()} · ${point.label}`}</title>
          </circle>
        ))}
        <text x={pad.l} y={14} className="chart-label">
          Est. 1RM (lb)
        </text>
        {goal && goalLabel ? (
          <text x={width - pad.r} y={yOf(goal) - 6} textAnchor="end" className="chart-label">
            Goal {goalLabel}
          </text>
        ) : null}
      </svg>
      {points.length === 0 ? <p className="empty">No sessions in this range yet.</p> : null}
    </div>
  );
}
