"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import type { Activity } from "@/lib/activities";
import { formatCompact } from "@/lib/time";

type ActivityBlockProps = {
  activity: Activity;
  totalMs: number;
  running: boolean;
  onToggle: () => void;
  onStartTimed: (durationMs: number) => void;
  onAddTime: (durationMs: number) => void;
};

export function ActivityBlock({
  activity,
  totalMs,
  running,
  onToggle,
  onStartTimed,
  onAddTime,
}: ActivityBlockProps) {
  const [countdownMinutes, setCountdownMinutes] = useState("25");
  const [addMinutes, setAddMinutes] = useState("25");

  function minutesToMs(raw: string): number | null {
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.round(value * 60_000);
  }

  function handleTimed(event: FormEvent) {
    event.preventDefault();
    const durationMs = minutesToMs(countdownMinutes);
    if (durationMs) onStartTimed(durationMs);
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const durationMs = minutesToMs(addMinutes);
    if (durationMs) onAddTime(durationMs);
  }

  return (
    <div
      className={`activity-block ${running ? "running" : ""}`}
      style={{ "--accent": activity.color } as CSSProperties}
    >
      <button type="button" className="activity-card" onClick={onToggle}>
        <span className="swatch" />
        <span className="activity-meta">
          <span className="activity-label">{activity.label}</span>
          <span className="activity-total">{formatCompact(totalMs)}</span>
        </span>
        <span className="activity-action">{running ? "Stop" : "Start"}</span>
      </button>
      <form className="countdown-form" onSubmit={handleTimed}>
        <label>
          <span>Countdown</span>
          <input
            type="number"
            min="1"
            max="600"
            inputMode="numeric"
            value={countdownMinutes}
            onChange={(event) => setCountdownMinutes(event.target.value)}
          />
        </label>
        <button type="submit">Start {countdownMinutes || "?"}m</button>
      </form>
      <form className="countdown-form add-form" onSubmit={handleAdd}>
        <label>
          <span>Add time</span>
          <input
            type="number"
            min="1"
            max="600"
            inputMode="numeric"
            value={addMinutes}
            onChange={(event) => setAddMinutes(event.target.value)}
          />
        </label>
        <button type="submit">Add {addMinutes || "?"}m</button>
      </form>
    </div>
  );
}
