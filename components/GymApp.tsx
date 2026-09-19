"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGym } from "@/hooks/useGym";
import { useWeekTimer } from "@/hooks/useWeekTimer";
import { sendAppEmail } from "@/lib/alerts";
import {
  BODY_PARTS,
  LIFT_COLORS,
  bestSet,
  bodyPartLabel,
  completedSets,
  epley1RM,
  exercisesForSplit,
  suggestedSplit,
  type BodyPart,
  type Exercise,
  type GymSet,
  type SplitType,
} from "@/lib/gym";
import { downloadGymPdf } from "@/lib/gymPdf";
import { gymWeekEmail, gymWeekStats, liftSeries } from "@/lib/gymStats";
import { dateKey, formatCompact, formatDayLabel } from "@/lib/time";
import { AppShell } from "./AppShell";
import { GymWeekPanel } from "./GymWeekPanel";
import { HeroTimer } from "./HeroTimer";

type DraftSet = { weight: string; reps: string };

function emptySets(): DraftSet[] {
  return [
    { weight: "", reps: "" },
    { weight: "", reps: "" },
  ];
}

function toSet(draft: DraftSet): GymSet {
  return { weight: Number(draft.weight) || 0, reps: Number(draft.reps) || 0 };
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
  const exercises = exercisesForSplit(split, gym.exercises);
  const [drafts, setDrafts] = useState<Record<string, DraftSet[]>>({});
  const [menuId, setMenuId] = useState<string | null>(null);
  const [overviewId, setOverviewId] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropOverId, setDropOverId] = useState<string | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [create, setCreate] = useState({
    label: "",
    bodyPart: "back" as BodyPart,
    overloadReps: "10",
  });

  const logsToday = useMemo(
    () =>
      Object.fromEntries(
        gym.logs.filter((log) => log.dateKey === todayKey).map((log) => [log.exerciseId, log]),
      ),
    [gym.logs, todayKey],
  );

  const weekStats = useMemo(
    () => gymWeekStats(gym.logs, gym.days, timer.sessions, gym.exercises),
    [gym.days, gym.exercises, gym.logs, timer.sessions],
  );
  const reportSeries = useMemo(
    () =>
      weekStats.topLifts.slice(0, 3).map((lift, index) => {
        return liftSeries(
          gym.logs,
          lift.exerciseId,
          gym.exercises,
          LIFT_COLORS[index % LIFT_COLORS.length],
        );
      }),
    [gym.exercises, gym.logs, weekStats.topLifts],
  );

  useEffect(() => {
    if (!auth.user?.email || weekStats.totalSets === 0) return;
    if (new Date().getDay() !== 0) return;
    const key = `gym-week-email-${weekStats.weekStart.toISOString().slice(0, 10)}`;
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "pending");
    const payload = gymWeekEmail(weekStats);
    void sendAppEmail({ email: auth.user.email, ...payload }).then((result) => {
      if (result.ok) window.localStorage.setItem(key, "1");
      else window.localStorage.removeItem(key);
      setNotice(
        result.pendingConfirm
          ? `Check ${auth.user?.email} to confirm FormSubmit, then weekly gym email will work.`
          : result.ok
            ? `Sent this week’s gym report to ${auth.user?.email}.`
            : result.error ?? "Could not send the weekly gym report.",
      );
    });
  }, [auth.user?.email, weekStats.totalSets, weekStats.weekStart, weekStats]);

  async function chooseSplit(next: SplitType) {
    setPicked(next);
    await gym.saveSplit(next);
  }

  async function startWorkout() {
    await gym.saveSplit(split);
    if (timer.activeSession?.activityId !== "gym") {
      await timer.start("gym");
    }
  }

  function lastLogFor(
  logs: { exerciseId: string; dateKey: string; loggedAt: number; sets: GymSet[] }[],
  exerciseId: string,
  todayKey: string,
) {
  return logs
    .filter((log) => log.exerciseId === exerciseId && log.dateKey !== todayKey)
    .sort((a, b) => b.loggedAt - a.loggedAt)[0];
}

function valuesForExercise(
  drafts: Record<string, DraftSet[]>,
  today: { sets: GymSet[] } | undefined,
  previous: { sets: GymSet[] } | undefined,
  exerciseId: string,
): DraftSet[] {
  if (drafts[exerciseId]) return drafts[exerciseId];
  if (today) {
    return today.sets.map((set) => ({
      weight: set.weight ? String(set.weight) : "",
      reps: set.reps ? String(set.reps) : "",
    }));
  }
  if (previous?.sets.length) {
    return previous.sets.map(() => ({ weight: "", reps: "" }));
  }
  return emptySets();
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
        <div className="split-pick">
          <button
            type="button"
            className="ghost"
            onClick={() => downloadGymPdf(weekStats, reportSeries)}
          >
            Download PDF
          </button>
          <Link href="/gym/progress" className="stop">
            Progress
          </Link>
        </div>
      </header>

      {gym.error ? <p className="sync-error">{gym.error}</p> : null}
      {timer.syncError ? <p className="sync-error">{timer.syncError}</p> : null}

      <HeroTimer
        activeSession={timer.activeSession?.activityId === "gym" ? timer.activeSession : null}
        now={timer.now}
        weekTotal={timer.gymTotal}
        classTotal={timer.weekTotal}
        stale={timer.stale && timer.activeSession?.activityId === "gym"}
        idleTitle="Start a workout"
        summary={`${formatCompact(timer.gymTotal)} gym this week`}
        activities={timer.activities}
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
          <button type="button" className="stop" onClick={() => void startWorkout()}>
            {timer.activeSession?.activityId === "gym" ? "Workout running" : "Start workout"}
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
                <span className="day-total">
                  {logged ? "Done" : today ? "Today" : planned === "rest" ? "—" : "Planned"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <GymWeekPanel
        stats={weekStats}
        series={reportSeries}
        email={auth.user?.email}
        notice={notice}
        onNotice={setNotice}
      />

      <section className="panel">
        <div className="panel-title">
          <h3>{split === "full-body" ? "Full body" : "Isolation"} exercises</h3>
          <p>Log as many sets as you want. Use ⋮⋮ to drag sets or lifts. Remove keeps the lift in All lifts with past weights.</p>
        </div>
        <form
          className="goal-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!create.label.trim()) return;
            void gym
              .createExercise({
                label: create.label,
                split,
                bodyPart: create.bodyPart,
                overloadReps: Number(create.overloadReps) || 10,
              })
              .then((result) => {
                if (result?.restored) {
                  setNotice(`Restored ${result.label} with previous weights.`);
                }
              });
            setCreate({ label: "", bodyPart: "back", overloadReps: "10" });
          }}
        >
          <label>
            <span>New exercise</span>
            <input
              value={create.label}
              placeholder="Lat pulldown"
              onChange={(event) => setCreate((current) => ({ ...current, label: event.target.value }))}
            />
          </label>
          <label>
            <span>Body part</span>
            <select
              value={create.bodyPart}
              onChange={(event) =>
                setCreate((current) => ({ ...current, bodyPart: event.target.value as BodyPart }))
              }
            >
              {BODY_PARTS.map((part) => (
                <option key={part} value={part}>
                  {bodyPartLabel(part)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Overload reps</span>
            <input
              type="number"
              min="1"
              value={create.overloadReps}
              onChange={(event) =>
                setCreate((current) => ({ ...current, overloadReps: event.target.value }))
              }
            />
          </label>
          <button type="submit" className="stop">
            Add lift
          </button>
        </form>
        <div className="gym-exercises">
          {exercises.map((exercise, index) => {
            const previous = lastLogFor(gym.logs, exercise.id, todayKey);
            return (
            <ExerciseLog
              key={exercise.id}
              exercise={exercise}
              values={valuesForExercise(
                drafts,
                logsToday[exercise.id],
                previous,
                exercise.id,
              )}
              lastSets={logsToday[exercise.id] ? undefined : previous?.sets}
              saved={Boolean(logsToday[exercise.id])}
              dragging={dragId === exercise.id}
              dropOver={dropOverId === exercise.id && dragId !== exercise.id}
              menuOpen={menuId === exercise.id}
              onMenu={() => setMenuId((current) => (current === exercise.id ? null : exercise.id))}
              onOverview={() => {
                setOverviewId(exercise.id);
                setCatalogOpen(false);
                setReorderOpen(false);
                setMenuId(null);
              }}
              onCatalog={() => {
                setCatalogOpen(true);
                setOverviewId(null);
                setReorderOpen(false);
                setMenuId(null);
              }}
              onReorderList={() => {
                setReorderOpen(true);
                setMenuId(null);
              }}
              onMove={(direction) => {
                const ids = exercises.map((item) => item.id);
                const from = index;
                const to = from + direction;
                if (to < 0 || to >= ids.length) return;
                const [moved] = ids.splice(from, 1);
                ids.splice(to, 0, moved);
                void gym.reorderExercises(split, ids);
                setMenuId(null);
              }}
              canMoveUp={index > 0}
              canMoveDown={index < exercises.length - 1}
              onAskDelete={() => {
                setConfirmId(exercise.id);
                setMenuId(null);
              }}
              onDragStart={() => setDragId(exercise.id)}
              onDragOverCard={() => {
                if (dragId && dragId !== exercise.id) setDropOverId(exercise.id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setDropOverId(null);
              }}
              onDrop={() => {
                if (!dragId || dragId === exercise.id) return;
                const ids = exercises.map((item) => item.id);
                const from = ids.indexOf(dragId);
                const to = ids.indexOf(exercise.id);
                ids.splice(from, 1);
                ids.splice(to, 0, dragId);
                void gym.reorderExercises(split, ids);
                setDragId(null);
                setDropOverId(null);
              }}
              onChange={(next) => setDrafts((current) => ({ ...current, [exercise.id]: next }))}
              onSave={async (values) => {
                await gym.saveSplit(split);
                await gym.saveSets(exercise.id, values.map(toSet), split);
              }}
            />
            );
          })}
        </div>
      </section>

      {overviewId ? (
        <Modal
          title={gym.exercises.find((item) => item.id === overviewId)?.label ?? "Lift"}
          onClose={() => setOverviewId(null)}
        >
          <LiftOverview
            exercise={gym.exercises.find((item) => item.id === overviewId)}
            logs={gym.logs.filter((log) => log.exerciseId === overviewId)}
          />
        </Modal>
      ) : null}

      {catalogOpen ? (
        <Modal title="All lifts" onClose={() => setCatalogOpen(false)}>
          <p className="muted">
            Removed lifts stay here with past weights. Add them back anytime.
          </p>
          <ol className="report-ranks catalog-list">
            {gym.exercises.map((exercise) => {
              const last = gym.logs
                .filter((log) => log.exerciseId === exercise.id)
                .sort((a, b) => b.loggedAt - a.loggedAt)[0];
              const set = last ? bestSet(completedSets(last.sets)) : null;
              return (
                <li key={exercise.id}>
                  <span className="rank-label">
                    {exercise.label}
                    {exercise.archived ? <em className="catalog-tag"> removed</em> : null}
                  </span>
                  <span className="rank-time">
                    {set
                      ? `${set.weight} x ${set.reps} · e1RM ${epley1RM(set.weight, set.reps).toFixed(1)}`
                      : "No logs yet"}
                  </span>
                  {exercise.archived ? (
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        void gym.restoreExercise(exercise.id);
                        setNotice(`Added ${exercise.label} back — previous weights still apply.`);
                      }}
                    >
                      Add back
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </Modal>
      ) : null}

      {reorderOpen ? (
        <Modal title="Order lifts" onClose={() => setReorderOpen(false)}>
          <p className="muted">This order is saved for the next time you lift this split.</p>
          <ol className="reorder-list">
            {exercises.map((exercise, index) => (
              <li key={exercise.id}>
                <span>{exercise.label}</span>
                <span className="split-pick">
                  <button
                    type="button"
                    className="ghost"
                    disabled={index === 0}
                    onClick={() => {
                      const ids = exercises.map((item) => item.id);
                      const [moved] = ids.splice(index, 1);
                      ids.splice(index - 1, 0, moved);
                      void gym.reorderExercises(split, ids);
                    }}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    disabled={index === exercises.length - 1}
                    onClick={() => {
                      const ids = exercises.map((item) => item.id);
                      const [moved] = ids.splice(index, 1);
                      ids.splice(index + 1, 0, moved);
                      void gym.reorderExercises(split, ids);
                    }}
                  >
                    Down
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </Modal>
      ) : null}

      {confirmId ? (
        <div className="confirm-modal" role="dialog" aria-modal="true">
          <div className="panel">
            <h3>Remove from this split?</h3>
            <p className="muted">
              {gym.exercises.find((item) => item.id === confirmId)?.label} leaves today’s list but
              stays in the catalog with past weights. Open All lifts → Add back anytime.
            </p>
            <div className="split-pick">
              <button type="button" className="ghost" onClick={() => setConfirmId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="stop"
                onClick={() => {
                  void gym.archiveExercise(confirmId);
                  setConfirmId(null);
                  setNotice("Removed from the split — still in All lifts with past weights.");
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="confirm-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="panel modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="panel-title">
          <h3>{title}</h3>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ExerciseLog({
  exercise,
  values,
  lastSets,
  saved,
  dragging,
  dropOver,
  menuOpen,
  canMoveUp,
  canMoveDown,
  onMenu,
  onOverview,
  onCatalog,
  onReorderList,
  onMove,
  onAskDelete,
  onDragStart,
  onDragOverCard,
  onDragEnd,
  onDrop,
  onChange,
  onSave,
}: {
  exercise: Exercise;
  values: DraftSet[];
  lastSets?: GymSet[];
  saved: boolean;
  dragging: boolean;
  dropOver: boolean;
  menuOpen: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMenu: () => void;
  onOverview: () => void;
  onCatalog: () => void;
  onReorderList: () => void;
  onMove: (direction: -1 | 1) => void;
  onAskDelete: () => void;
  onDragStart: () => void;
  onDragOverCard: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onChange: (next: DraftSet[]) => void;
  onSave: (values: DraftSet[]) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const dragSet = useRef<number | null>(null);
  const [dropSet, setDropSet] = useState<number | null>(null);

  function moveSet(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    const next = [...values];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function removeSet(index: number) {
    if (values.length <= 1) return;
    const next = values.filter((_, itemIndex) => itemIndex !== index);
    onChange(next);
    if (saved) void onSave(next);
  }

  return (
    <article
      className={`gym-card ${dragging ? "dragging" : ""} ${dropOver ? "drop-over" : ""}`}
      onDragOver={(event) => {
        const types = [...event.dataTransfer.types];
        if (types.some((type) => type.includes("exercise") || type === "text/plain")) {
          event.preventDefault();
          onDragOverCard();
        }
      }}
      onDrop={(event) => {
        const raw = event.dataTransfer.getData("text/plain");
        if (raw.startsWith("set:")) return;
        onDrop();
      }}
    >
      <div className="gym-card-head">
        <button
          type="button"
          className="drag-handle"
          draggable
          aria-label={`Reorder ${exercise.label}`}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", `exercise:${exercise.id}`);
            event.dataTransfer.setData("text/exercise-id", exercise.id);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
        >
          ⋮⋮
        </button>
        <div>
          <h3>{exercise.label}</h3>
          <p>
            {bodyPartLabel(exercise.bodyPart)} · overload at {exercise.overloadReps} reps
            {lastSets?.length
              ? ` · last ${lastSets
                  .filter((set) => set.weight > 0 || set.reps > 0)
                  .map((set) => `${set.weight}×${set.reps}`)
                  .join(", ")}`
              : ""}
          </p>
        </div>
        <div className="menu-wrap">
          <button type="button" className="ghost icon-btn" onClick={onMenu} aria-label="Exercise menu">
            ⋯
          </button>
          {menuOpen ? (
            <div className="menu-pop">
              <button type="button" onClick={onOverview}>
                Lift overview
              </button>
              <button type="button" onClick={onCatalog}>
                All lifts
              </button>
              <button type="button" onClick={onReorderList}>
                Reorder lifts
              </button>
              <button type="button" disabled={!canMoveUp} onClick={() => onMove(-1)}>
                Move up
              </button>
              <button type="button" disabled={!canMoveDown} onClick={() => onMove(1)}>
                Move down
              </button>
              <button
                type="button"
                onClick={() => onChange([...values, { weight: "", reps: "" }])}
              >
                Add set
              </button>
              <button type="button" onClick={onAskDelete}>
                Remove from split
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="set-grid">
        {values.map((set, index) => (
          <fieldset
            key={`set-${index}`}
            className={`set-fields ${dropSet === index ? "drop-target" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDropSet(index);
            }}
            onDragLeave={() => setDropSet((current) => (current === index ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const raw =
                event.dataTransfer.getData("text/plain") ||
                event.dataTransfer.getData("text/set-index");
              const from = raw.startsWith("set:") ? Number(raw.slice(4)) : Number(raw);
              moveSet(Number.isFinite(from) ? from : dragSet.current ?? -1, index);
              dragSet.current = null;
              setDropSet(null);
            }}
          >
            <legend className="set-legend">
              <span
                className="drag-handle"
                draggable
                onDragStart={(event) => {
                  event.stopPropagation();
                  dragSet.current = index;
              event.dataTransfer.setData("text/plain", `set:${index}`);
              event.dataTransfer.setData("text/set-index", String(index));
                }}
                onDragEnd={() => {
                  dragSet.current = null;
                  setDropSet(null);
                }}
              >
                ⋮⋮
              </span>
              Set {index + 1}
              <button
                type="button"
                className="set-delete"
                disabled={values.length <= 1}
                onClick={() => removeSet(index)}
                aria-label={`Delete set ${index + 1}`}
              >
                Delete
              </button>
            </legend>
            <label>
              <span>Weight</span>
              <input
                type="number"
                min="0"
                step="0.5"
                inputMode="decimal"
                draggable={false}
                placeholder={
                  lastSets?.[index]?.weight ? String(lastSets[index].weight) : ""
                }
                value={set.weight}
                onChange={(event) => {
                  const next = values.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, weight: event.target.value } : item,
                  );
                  onChange(next);
                }}
              />
            </label>
            <label>
              <span>Reps</span>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                draggable={false}
                placeholder={
                  lastSets?.[index]?.reps ? String(lastSets[index].reps) : ""
                }
                value={set.reps}
                onChange={(event) => {
                  const next = values.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, reps: event.target.value } : item,
                  );
                  onChange(next);
                }}
              />
            </label>
          </fieldset>
        ))}
      </div>
      <div className="split-pick">
        <button
          type="button"
          className="ghost"
          onClick={() => onChange([...values, { weight: "", reps: "" }])}
        >
          Add set
        </button>
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
      </div>
    </article>
  );
}

function LiftOverview({
  exercise,
  logs,
}: {
  exercise?: Exercise;
  logs: { loggedAt: number; dateKey: string; sets: GymSet[] }[];
}) {
  if (!exercise) return <p className="empty">Lift not found.</p>;
  const recent = [...logs].sort((a, b) => b.loggedAt - a.loggedAt).slice(0, 8);
  return (
    <>
      <p className="muted">
        {bodyPartLabel(exercise.bodyPart)} · overload {exercise.overloadReps} reps · Epley e1RM from
        the best set each session
      </p>
      {recent.length === 0 ? (
        <p className="empty">No logs yet.</p>
      ) : (
        <ol className="report-ranks">
          {recent.map((log) => {
            const set = bestSet(completedSets(log.sets));
            return (
              <li key={log.dateKey}>
                <span className="rank-label">{log.dateKey}</span>
                <span className="rank-time">
                  {completedSets(log.sets)
                    .map((item) => `${item.weight}x${item.reps}`)
                    .join(" · ")}{" "}
                  · best e1RM {epley1RM(set.weight, set.reps).toFixed(1)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
