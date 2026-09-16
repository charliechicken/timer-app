"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import type { Activity } from "@/lib/activities";
import { formatCompact, isSameDay, startOfDay } from "@/lib/time";

type ActivityBlockProps = {
  activity: Activity;
  totalMs: number;
  running: boolean;
  selectedDay: Date;
  onToggle: () => void;
  onStartTimed: (durationMs: number) => void;
  onAddTime: (
    durationMs: number,
    options?: { startAt?: number; spread?: boolean },
  ) => void;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function timeValueFor(day: Date): string {
  const now = new Date();
  if (isSameDay(day, now)) return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return "09:00";
}

function startAtFrom(day: Date, time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  const date = startOfDay(day);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.getTime();
}

export function ActivityBlock({
  activity,
  totalMs,
  running,
  selectedDay,
  onToggle,
  onStartTimed,
  onAddTime,
}: ActivityBlockProps) {
  const [countdownMinutes, setCountdownMinutes] = useState("25");
  const [addMinutes, setAddMinutes] = useState("25");
  const [startTime, setStartTime] = useState(() => timeValueFor(selectedDay));
  const [spread, setSpread] = useState(false);

  useEffect(() => {
    setStartTime(timeValueFor(selectedDay));
  }, [selectedDay]);

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
    if (!durationMs) return;
    onAddTime(durationMs, {
      startAt: startAtFrom(selectedDay, startTime),
      spread,
    });
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
        <label>
          <span>Starts</span>
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </label>
        <label className="spread-check">
          <input
            type="checkbox"
            checked={spread}
            onChange={(event) => setSpread(event.target.checked)}
          />
          <span>Spread through the day</span>
        </label>
        <button type="submit">Add {addMinutes || "?"}m</button>
      </form>
    </div>
  );
}
