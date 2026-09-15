"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGym } from "@/hooks/useGym";
import { useWeekTimer } from "@/hooks/useWeekTimer";
import {
  BODY_PARTS,
  bodyPartLabel,
  exercisesForSplit,
  suggestedSplit,
  type Exercise,
  type GymSet,
  type SplitType,
} from "@/lib/gym";
import { dateKey, formatCompact, formatDayLabel } from "@/lib/time";
import { AppShell } from "./AppShell";
import { HeroTimer } from "./HeroTimer";

type Draft = Record<string, [string, string, string, string]>;

function emptyDraft(): [string, string, string, string] {
  return ["", "", "", ""];
}

function toSet(weight: string, reps: string): GymSet {
  return {
    weight: Number(weight) || 0,
    reps: Number(reps) || 0,
  };
}

export function GymApp() {
  const auth = useAuth();
  const gym = useGym(auth.user?.uid ?? null);
  const timer = useWeekTimer(auth.user?.uid ?? null);
  const todayKey = dateKey();
  const todayLog = gym.days.find((day) => day.dateKey === todayKey);
  const suggestion = suggestedSplit();
  const [picked, setPicked] = useState<SplitType | null>(null);
  const split = picked ?? todayLog?.split ?? (suggestion === "rest" ? "full-body" : suggestion);
  const exercises = exercisesForSplit(split);
  const [drafts, setDrafts] = useState<Draft>({});

  const logsToday = useMemo(
    () =>
      Object.fromEntries(
        gym.logs.filter((log) => log.dateKey === todayKey).map((log) => [log.exerciseId, log]),
      ),
    [gym.logs, todayKey],
  );

  async function chooseSplit(next: SplitType) {
    setPicked(next);
    await gym.saveSplit(next);
    if (timer.activeSession?.activityId !== "gym") {
      await timer.start("gym");
    }
  }

  async function startGym() {
    await gym.saveSplit(split);
    if (timer.activeSession?.activityId !== "gym") {
      await timer.start("gym");
    }
  }

  return (
    <AppShell>
      <header className="topbar">
        <div>
          <p className="brand">Gym</p>
          <h2>
            {suggestion === "rest"
              ? "Sunday rest — or pick a split anyway"
              : suggestion === "full-body"
                ? "Full body day"
                : "Isolation day"}
          </h2>
        </div>
        <Link href="/gym/progress" className="stop">
          Progress
        </Link>
      </header>

      {gym.error ? <p className="sync-error">{gym.error}</p> : null}
      {timer.syncError ? <p className="sync-error">{timer.syncError}</p> : null}

      <HeroTimer
        activeSession={timer.activeSession?.activityId === "gym" ? timer.activeSession : null}
        now={timer.now}
        weekTotal={timer.gymTotal}
        classTotal={timer.weekTotal}
        stale={timer.stale && timer.activeSession?.activityId === "gym"}
        idleTitle="Pick a split to start"
        summary={`${formatCompact(timer.gymTotal)} gym this week`}
        onStop={() => void timer.stop()}
      />

      <section className="panel">
        <div className="panel-title">
          <h3>Today’s split</h3>
          <p>Mon / Wed / Fri full body · Tue / Thu / Sat isolation · Sun rest</p>
        </div>
        <div className="split-pick">
          <button
            type="button"
            className={split === "full-body" ? "stop" : "ghost"}
            onClick={() => void chooseSplit("full-body")}
          >
            Full body
          </button>
          <button
            type="button"
            className={split === "isolation" ? "stop" : "ghost"}
            onClick={() => void chooseSplit("isolation")}
          >
            Isolation
          </button>
          <button type="button" className="ghost" onClick={() => void startGym()}>
            {timer.activeSession?.activityId === "gym" ? "Gym timer running" : "Start gym timer"}
          </button>
        </div>
        <div className="week-chart gym-week">
          {gym.weekDays.map((day) => {
            const key = dateKey(day);
            const logged = gym.days.find((item) => item.dateKey === key);
            const planned = suggestedSplit(day);
            const today = key === todayKey;
            return (
              <div key={key} className={`gym-day ${today ? "selected" : ""}`}>
                <strong>{formatDayLabel(day)}</strong>
                <span>
                  {logged
                    ? logged.split === "full-body"
                      ? "Full body"
                      : "Isolation"
                    : planned === "rest"
                      ? "Rest"
                      : planned === "full-body"
                        ? "Full body"
                        : "Isolation"}
                </span>
                <span className="day-total">{logged ? "Done" : today ? "Today" : planned === "rest" ? "—" : "Planned"}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>Sets by body part this week</h3>
          <p>Each logged set counts once</p>
        </div>
        <div className="body-parts">
          {BODY_PARTS.map((part) => (
            <article key={part}>
              <p>{bodyPartLabel(part)}</p>
              <strong>{gym.setsByBodyPart[part]}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>{split === "full-body" ? "Full body" : "Isolation"} exercises</h3>
          <p>Two sets each. Overload when you hit the listed reps.</p>
        </div>
        <div className="gym-exercises">
          {exercises.map((exercise) => (
            <ExerciseLog
              key={exercise.id}
              exercise={exercise}
              values={
                drafts[exercise.id] ??
                (logsToday[exercise.id]
                  ? [
                      String(logsToday[exercise.id].sets[0].weight || ""),
                      String(logsToday[exercise.id].sets[0].reps || ""),
                      String(logsToday[exercise.id].sets[1].weight || ""),
                      String(logsToday[exercise.id].sets[1].reps || ""),
                    ]
                  : emptyDraft())
              }
              saved={Boolean(logsToday[exercise.id])}
              onChange={(next) =>
                setDrafts((current) => ({ ...current, [exercise.id]: next }))
              }
              onStart={() => void startGym()}
              onSave={async (values) => {
                await gym.saveSplit(split);
                await gym.saveSets(
                  exercise.id,
                  [toSet(values[0], values[1]), toSet(values[2], values[3])],
                  split,
                );
              }}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function ExerciseLog({
  exercise,
  values,
  saved,
  onChange,
  onStart,
  onSave,
}: {
  exercise: Exercise;
  values: [string, string, string, string];
  saved: boolean;
  onChange: (next: [string, string, string, string]) => void;
  onStart: () => void;
  onSave: (values: [string, string, string, string]) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <article className="gym-card">
      <div className="gym-card-head">
        <div>
          <h3>{exercise.label}</h3>
          <p>
            {bodyPartLabel(exercise.bodyPart)} · overload at {exercise.overloadReps} reps
          </p>
        </div>
        <button type="button" className="ghost" onClick={onStart}>
          Start
        </button>
      </div>
      <div className="set-grid">
        <SetFields
          label="Set 1"
          weight={values[0]}
          reps={values[1]}
          onWeight={(value) => onChange([value, values[1], values[2], values[3]])}
          onReps={(value) => onChange([values[0], value, values[2], values[3]])}
        />
        <SetFields
          label="Set 2"
          weight={values[2]}
          reps={values[3]}
          onWeight={(value) => onChange([values[0], values[1], value, values[3]])}
          onReps={(value) => onChange([values[0], values[1], values[2], value])}
        />
      </div>
      <button
        type="button"
        className="stop"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void onSave(values).finally(() => setBusy(false));
        }}
      >
        {busy ? "Saving…" : saved ? "Update sets" : "Save sets"}
      </button>
    </article>
  );
}

function SetFields({
  label,
  weight,
  reps,
  onWeight,
  onReps,
}: {
  label: string;
  weight: string;
  reps: string;
  onWeight: (value: string) => void;
  onReps: (value: string) => void;
}) {
  return (
    <fieldset className="set-fields">
      <legend>{label}</legend>
      <label>
        <span>Weight</span>
        <input
          type="number"
          min="0"
          step="0.5"
          inputMode="decimal"
          value={weight}
          onChange={(event) => onWeight(event.target.value)}
        />
      </label>
      <label>
        <span>Reps</span>
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={reps}
          onChange={(event) => onReps(event.target.value)}
        />
      </label>
    </fieldset>
  );
}
