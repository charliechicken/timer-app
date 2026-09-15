"use client";

import type { CSSProperties } from "react";
import type { Activity } from "@/lib/activities";
import { formatCompact } from "@/lib/time";

type ActivityCardProps = {
  activity: Activity;
  totalMs: number;
  running: boolean;
  onToggle: () => void;
};

export function ActivityCard({
  activity,
  totalMs,
  running,
  onToggle,
}: ActivityCardProps) {
  return (
    <button
      type="button"
      className={`activity-card ${running ? "running" : ""}`}
      style={{ "--accent": activity.color } as CSSProperties}
      onClick={onToggle}
    >
      <span className="swatch" />
      <span className="activity-meta">
        <span className="activity-label">{activity.label}</span>
        <span className="activity-total">{formatCompact(totalMs)}</span>
      </span>
      <span className="activity-action">{running ? "Stop" : "Start"}</span>
    </button>
  );
}
