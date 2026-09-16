"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGym } from "@/hooks/useGym";
import { useWeekTimer } from "@/hooks/useWeekTimer";
import { LIFT_COLORS, epley1RM, visibleExercises } from "@/lib/gym";
import { gymWeekStats, liftSeries } from "@/lib/gymStats";
import { addDays, startOfDay, startOfWeek } from "@/lib/time";
import { AppShell } from "./AppShell";
import { GymWeekPanel } from "./GymWeekPanel";
import { LiftChart } from "./LiftChart";

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
  const timer = useWeekTimer(auth.user?.uid ?? null);
  const catalog = visibleExercises(gym.exercises);
  const [range, setRange] = useState<Range>("month");
  const [selected, setSelected] = useState<string[]>(["barbell-bench-press"]);
  const [normalize, setNormalize] = useState(false);
  const [weight, setWeight] = useState("200");
  const [reps, setReps] = useState("5");
  const [notice, setNotice] = useState<string | null>(null);

  const focusId = selected[0] ?? catalog[0]?.id ?? "barbell-bench-press";
  const exercise = gym.exerciseLookup[focusId];
  const goal = gym.goals.find((item) => item.exerciseId === focusId);
  const from = rangeStart(range).getTime();

  const series = useMemo(
    () =>
      selected.map((exerciseId, index) =>
        liftSeries(
          gym.logs,
          exerciseId,
          gym.exercises,
          LIFT_COLORS[index % LIFT_COLORS.length],
          from,
        ),
      ),
    [from, gym.exercises, gym.logs, selected],
  );

  const weekStats = useMemo(
    () => gymWeekStats(gym.logs, gym.days, timer.sessions, gym.exercises),
    [gym.days, gym.exercises, gym.logs, timer.sessions],
  );

  function toggleLift(exerciseId: string) {
    setSelected((current) => {
      if (current.includes(exerciseId)) {
        return current.length === 1 ? current : current.filter((id) => id !== exerciseId);
      }
      return [...current, exerciseId];
    });
    const nextGoal = gym.goals.find((item) => item.exerciseId === exerciseId);
    if (nextGoal) {
      setWeight(String(nextGoal.weight));
      setReps(String(nextGoal.reps));
    }
  }

  function handleGoal(event: FormEvent) {
    event.preventDefault();
    const nextWeight = Number(weight);
    const nextReps = Number(reps);
    if (!nextWeight || !nextReps) return;
    void gym.upsertGoal({
      id: goal?.id ?? `goal-${focusId}`,
      exerciseId: focusId,
      weight: nextWeight,
      reps: nextReps,
    });
  }

  return (
    <AppShell>
      <header className="topbar">
        <div>
          <p className="brand">Gym progress</p>
          <h2>{selected.length > 1 ? "Compared lifts" : exercise?.label ?? "Lifts"}</h2>
        </div>
        <Link href="/gym" className="ghost">
          Back to gym
        </Link>
      </header>

      {gym.error ? <p className="sync-error">{gym.error}</p> : null}

      <GymWeekPanel
        stats={weekStats}
        series={series}
        email={auth.user?.email}
        notice={notice}
        onNotice={setNotice}
      />

      <section className="panel">
        <div className="panel-title">
          <h3>Epley e1RM</h3>
          <p>
            Best set each session: weight × (1 + reps / 30). Dashed segments are PRs vs the previous
            log. Dotted line is EMA.
          </p>
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
          <button
            type="button"
            className={normalize ? "stop" : "ghost"}
            onClick={() => setNormalize((value) => !value)}
          >
            {normalize ? "Indexed" : "Raw lb"}
          </button>
        </div>
        <div className="lift-picks">
          {catalog.map((item) => (
            <label key={item.id} className={selected.includes(item.id) ? "on" : ""}>
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={() => toggleLift(item.id)}
              />
              {item.label}
            </label>
          ))}
        </div>
        <LiftChart
          series={series}
          goal={selected.length === 1 && goal ? epley1RM(goal.weight, goal.reps) : undefined}
          goalLabel={goal ? `${goal.weight} x ${goal.reps}` : undefined}
          normalize={normalize}
        />
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>Goal for {exercise?.label ?? "this lift"}</h3>
          <p>Applies to the first checked lift. Bench 200×5 and RDL 225×7 are already there.</p>
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
