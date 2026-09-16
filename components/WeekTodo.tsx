"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { addDays, dateKey, formatWeekRange } from "@/lib/time";
import { moveTaskToIndex, type WeekTask } from "@/lib/tasks";

function mixRgb(a: readonly [number, number, number], b: readonly [number, number, number], t: number) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ] as const;
}

function cortisolTone(priority: number, count: number) {
  const t = count <= 1 ? 0 : (priority - 1) / (count - 1);
  const red = [220, 38, 38] as const;
  const orange = [234, 88, 12] as const;
  const green = [22, 163, 74] as const;
  const [r, g, b] = t < 0.5 ? mixRgb(red, orange, t * 2) : mixRgb(orange, green, (t - 0.5) * 2);
  const label =
    t < 0.25 ? "high cortisol" : t < 0.5 ? "elevated cortisol" : t < 0.75 ? "easing cortisol" : "low cortisol";
  return { t, color: `rgb(${r} ${g} ${b})`, label };
}

function CortisolFace({ t }: { t: number }) {
  const stage = Math.min(4, Math.round(t * 4));
  const blush = [0.42, 0.32, 0.18, 0.08, 0][stage];
  return (
    <svg className="todo-face" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.16" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <ellipse cx="8" cy="13.6" rx="2.3" ry="1.4" fill={`rgba(220,38,38,${blush})`} />
      <ellipse cx="16" cy="13.6" rx="2.3" ry="1.4" fill={`rgba(220,38,38,${blush})`} />
      {stage === 0 ? (
        <>
          <path d="M6.4 8.6 L11 11.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M17.6 8.6 L13 11.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="8.6" cy="12.4" r="1.35" fill="currentColor" />
          <circle cx="15.4" cy="12.4" r="1.35" fill="currentColor" />
          <path d="M18.4 6.2c.9 1.5.3 2.9-.4 3.3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <ellipse cx="12" cy="17.2" rx="2.1" ry="1.6" fill="currentColor" />
        </>
      ) : null}
      {stage === 1 ? (
        <>
          <path d="M6.6 9 Q8.8 11.2 11 9.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M13 9.6 Q15.2 11.2 17.4 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8.6" cy="12.3" r="1.25" fill="currentColor" />
          <circle cx="15.4" cy="12.3" r="1.25" fill="currentColor" />
          <path d="M8.4 16.8 Q12 14.7 15.6 16.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </>
      ) : null}
      {stage === 2 ? (
        <>
          <path d="M6.8 9.4 H11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M13 9.4 H17.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8.6" cy="12.2" r="1.2" fill="currentColor" />
          <circle cx="15.4" cy="12.2" r="1.2" fill="currentColor" />
          <path d="M8.6 16.8 H15.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </>
      ) : null}
      {stage === 3 ? (
        <>
          <path d="M6.8 9.8 Q8.8 8.4 11 9.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M13 9.4 Q15.2 8.4 17.2 9.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8.6" cy="12.1" r="1.15" fill="currentColor" />
          <circle cx="15.4" cy="12.1" r="1.15" fill="currentColor" />
          <path d="M8.4 16.4 Q12 18.2 15.6 16.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </>
      ) : null}
      {stage === 4 ? (
        <>
          <path d="M6.8 10 Q8.8 8.2 11 9.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M13 9.6 Q15.2 8.2 17.2 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M7.4 12.2 Q8.6 10.8 9.8 12.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M14.2 12.2 Q15.4 10.8 16.6 12.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8.2 16.2 Q12 19.2 15.8 16.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  );
}

type WeekTodoProps = {
  weekStart: Date;
  tasks: WeekTask[];
  error?: string | null;
  onAdd: (title: string, dueKey: string) => Promise<void>;
  onDue: (id: string, dueKey: string) => Promise<void>;
  onTitle: (id: string, title: string) => Promise<void>;
  onCommitOrder: (tasks: WeekTask[]) => Promise<void>;
  onToggle: (id: string, done: boolean) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
};

function TitleField({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => {
    setText(value);
  }, [value]);
  return (
    <input
      className="todo-name"
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        const next = text.trim();
        if (next && next !== value) onCommit(next);
        else setText(value);
      }}
    />
  );
}

export function WeekTodo({
  weekStart,
  tasks,
  error,
  onAdd,
  onDue,
  onTitle,
  onCommitOrder,
  onToggle,
  onRemove,
}: WeekTodoProps) {
  const defaultDue = dateKey(addDays(weekStart, 4));
  const [title, setTitle] = useState("");
  const [dueKey, setDueKey] = useState(defaultDue);

  useEffect(() => {
    setDueKey(dateKey(addDays(weekStart, 4)));
  }, [weekStart]);

  const minDue = dateKey(weekStart);
  const maxDue = dateKey(addDays(weekStart, 6));
  const count = tasks.length;

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    await onAdd(title, dueKey);
    setTitle("");
    setDueKey(defaultDue);
  }

  function move(id: string, delta: number) {
    const from = tasks.findIndex((task) => task.id === id);
    if (from < 0) return;
    void onCommitOrder(moveTaskToIndex(tasks, id, from + delta));
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h3>Homework this week</h3>
          <p>
            {formatWeekRange(weekStart)}. Use ↑ ↓ to set priority 1–{count || "n"}. 1 is red / high
            cortisol; last is green / low cortisol.
          </p>
        </div>
      </div>
      {error ? <p className="sync-error">{error}</p> : null}
      <form className="goal-form todo-form" onSubmit={(event) => void handleAdd(event)}>
        <label className="todo-title-field">
          <span>Homework</span>
          <input
            value={title}
            placeholder="PHIL 1125 paper"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          <span>Due</span>
          <input
            type="date"
            value={dueKey}
            min={minDue}
            max={maxDue}
            onChange={(event) => setDueKey(event.target.value)}
          />
        </label>
        <button type="submit" className="stop">
          Add task
        </button>
      </form>
      {tasks.length === 0 ? (
        <p className="empty">No homework listed for this week yet.</p>
      ) : (
        <ol className="todo-list">
          {tasks.map((task, index) => {
            const tone = cortisolTone(task.priority, tasks.length);
            return (
              <li
                key={task.id}
                className={task.done ? "done" : ""}
                style={{ "--cortisol": tone.color } as CSSProperties}
              >
                <div className="todo-shift">
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={`Raise priority of ${task.title}`}
                    onClick={() => move(task.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === tasks.length - 1}
                    aria-label={`Lower priority of ${task.title}`}
                    onClick={() => move(task.id, 1)}
                  >
                    ↓
                  </button>
                </div>
                <span
                  className="todo-rank"
                  title={`Priority ${task.priority} · ${tone.label}`}
                  aria-label={`Priority ${task.priority}, ${tone.label}`}
                >
                  <CortisolFace t={tone.t} />
                  <span className="todo-rank-n">{task.priority}</span>
                </span>
                <label className="todo-check">
                  <input
                    type="checkbox"
                    checked={task.done}
                    aria-label={`Mark ${task.title} done`}
                    onChange={(event) => void onToggle(task.id, event.target.checked)}
                  />
                </label>
                <TitleField value={task.title} onCommit={(next) => void onTitle(task.id, next)} />
                <input
                  type="date"
                  value={task.dueKey}
                  min={minDue}
                  max={maxDue}
                  onChange={(event) => void onDue(task.id, event.target.value)}
                />
                <button
                  type="button"
                  className="ghost"
                  onClick={() => void onRemove(task.id)}
                  aria-label={`Delete ${task.title}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
