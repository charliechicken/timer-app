"use client";

import { useMemo, useState } from "react";
import type { LiftSeries } from "@/lib/gymStats";
import { startOfDay } from "@/lib/time";

type LiftChartProps = {
  series: LiftSeries[];
  goal?: number;
  goalLabel?: string;
  normalize?: boolean;
};

type Hovered = {
  x: number;
  y: number;
  title: string;
  date: string;
  e1rm: string;
  set: string;
};

function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (max <= min) return [min, min + 1];
  const rough = (max - min) / Math.max(count - 1, 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1e-6))));
  const residual = rough / magnitude;
  const step =
    (residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10) * magnitude;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= max + step / 2 && ticks.length < 7; value += step) {
    ticks.push(Number(value.toFixed(step >= 1 ? 0 : 1)));
  }
  return ticks.length ? ticks : [min, max];
}

function formatAxisDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dayStamp(time: number, dateKey?: string): number {
  if (dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    if (year && month && day) return new Date(year, month - 1, day).getTime();
  }
  return startOfDay(new Date(time)).getTime();
}

function dateTicks(times: number[]): number[] {
  const uniqueDays = [
    ...new Set(times.map((time) => startOfDay(new Date(time)).getTime())),
  ].sort((a, b) => a - b);
  if (uniqueDays.length <= 6) return uniqueDays;
  const picks = [uniqueDays[0]];
  for (let index = 1; index <= 4; index += 1) {
    const at = Math.round((index * (uniqueDays.length - 1)) / 5);
    picks.push(uniqueDays[at]);
  }
  picks.push(uniqueDays[uniqueDays.length - 1]);
  return [...new Set(picks)];
}

export function LiftChart({ series, goal, goalLabel, normalize = false }: LiftChartProps) {
  const width = 760;
  const height = 300;
  const pad = { l: 48, r: 28, t: 36, b: 48 };
  const [hover, setHover] = useState<Hovered | null>(null);

  const scaled = useMemo(() => {
    const active = series.filter((item) => item.points.length);
    return active.map((item) => {
      const first = item.points[0]?.y || 1;
      const points = item.points.map((point) => ({
        ...point,
        plot: normalize ? (point.y / first) * 100 : point.y,
      }));
      const ema = item.ema.map((value) =>
        normalize ? (value / first) * 100 : value,
      );
      return { ...item, points, ema };
    });
  }, [normalize, series]);

  const ys = scaled.flatMap((item) => [
    ...item.points.map((point) => point.plot),
    ...item.ema,
    ...(goal && !normalize ? [goal] : []),
  ]);
  const minY = ys.length ? Math.max(0, Math.min(...ys) * 0.88) : 0;
  const maxY = ys.length ? Math.max(...ys) * 1.12 : 1;
  const days = [
    ...new Set(
      scaled.flatMap((item) => item.points.map((point) => dayStamp(point.t, point.dateKey))),
    ),
  ].sort((a, b) => a - b);
  const rawMinX = days[0] ?? Date.now();
  const rawMaxX = days[days.length - 1] ?? rawMinX;
  const dayMs = 24 * 60 * 60 * 1000;
  const padX = days.length <= 1 ? 2 * dayMs : Math.max((rawMaxX - rawMinX) * 0.1, dayMs);
  const minX = rawMinX - padX;
  const maxX = rawMaxX + padX;
  const spanX = Math.max(1, maxX - minX);
  const xOf = (t: number, dateKey?: string) =>
    pad.l + ((dayStamp(t, dateKey) - minX) / spanX) * (width - pad.l - pad.r);
  const yOf = (y: number) =>
    pad.t + (1 - (y - minY) / Math.max(0.001, maxY - minY)) * (height - pad.t - pad.b);
  const yTicks = niceTicks(minY, maxY);
  const xTickTimes = dateTicks(days);

  return (
    <div className="chart-wrap" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="session-chart" role="img">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.l}
              x2={width - pad.r}
              y1={yOf(tick)}
              y2={yOf(tick)}
              className="chart-grid"
            />
            <text x={pad.l - 8} y={yOf(tick) + 4} textAnchor="end" className="chart-axis">
              {tick >= 100 ? tick.toFixed(0) : tick.toFixed(tick % 1 ? 1 : 0)}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={pad.l} y1={pad.t} y2={height - pad.b} className="chart-axis-line" />
        <line
          x1={pad.l}
          x2={width - pad.r}
          y1={height - pad.b}
          y2={height - pad.b}
          className="chart-axis-line"
        />
        <text x={pad.l} y={16} className="chart-label">
          {normalize ? "Indexed (first session = 100)" : "Epley e1RM (lb)"}
        </text>
        {goal && !normalize ? (
          <>
            <line
              x1={pad.l}
              x2={width - pad.r}
              y1={yOf(goal)}
              y2={yOf(goal)}
              className="goal-line"
            />
            <text x={width - pad.r} y={yOf(goal) - 6} textAnchor="end" className="chart-label">
              Goal {goalLabel}
            </text>
          </>
        ) : null}
        {scaled.map((item) => (
          <g key={item.exerciseId}>
            {item.points.slice(1).map((point, index) => {
              const prev = item.points[index];
              return (
                <line
                  key={`${item.exerciseId}-seg-${point.t}`}
                    x1={xOf(prev.t, prev.dateKey)}
                    y1={yOf(prev.plot)}
                    x2={xOf(point.t, point.dateKey)}
                  y2={yOf(point.plot)}
                  stroke={item.color}
                  strokeWidth="2.4"
                  strokeDasharray={point.improved ? "6 5" : undefined}
                  fill="none"
                />
              );
            })}
            {item.points.length > 1 ? (
              <path
                d={item.points
                  .map(
                    (point, index) =>
                      `${index === 0 ? "M" : "L"} ${xOf(point.t, point.dateKey)} ${yOf(item.ema[index] ?? point.plot)}`,
                  )
                  .join(" ")}
                fill="none"
                stroke={item.color}
                strokeWidth="1.6"
                strokeDasharray="2 7"
                opacity="0.7"
              />
            ) : null}
            {item.points.map((point) => {
              const cx = xOf(point.t, point.dateKey);
              const cy = yOf(point.plot);
              const e1rm = `${point.y.toFixed(1)}`;
              return (
                <g key={`${item.exerciseId}-${point.dateKey}-${point.t}`}>
                  <text x={cx} y={cy - 12} textAnchor="middle" className="chart-point">
                    {e1rm}
                  </text>
                  <circle cx={cx} cy={cy} r="5" fill={item.color} />
                  <circle
                    cx={cx}
                    cy={cy}
                    r="14"
                    fill="transparent"
                    className="chart-hit"
                    onMouseEnter={() =>
                      setHover({
                        x: cx,
                        y: cy,
                        title: item.label,
                        date: formatAxisDate(dayStamp(point.t, point.dateKey)),
                        e1rm: `${e1rm} lb e1RM`,
                        set: point.label,
                      })
                    }
                  />
                </g>
              );
            })}
          </g>
        ))}
        {xTickTimes.map((time) => (
          <text
            key={time}
            x={xOf(time)}
            y={height - 16}
            textAnchor="middle"
            className="chart-axis"
          >
            {formatAxisDate(time)}
          </text>
        ))}
        <text x={(pad.l + width - pad.r) / 2} y={height - 2} textAnchor="middle" className="chart-label">
          Date
        </text>
      </svg>
      {hover ? (
        <div
          className="chart-tooltip"
          style={{
            left: `${(hover.x / width) * 100}%`,
            top: `${(hover.y / height) * 100}%`,
          }}
        >
          <strong>{hover.title}</strong>
          <span>{hover.date}</span>
          <span>{hover.e1rm}</span>
          <span>{hover.set}</span>
        </div>
      ) : null}
      {scaled.length ? (
        <>
          <ul className="chart-legend">
            {scaled.map((item) => (
              <li key={item.exerciseId}>
                <span className="dot" style={{ background: item.color }} />
                {item.label}
              </li>
            ))}
          </ul>
          <p className="chart-key">solid = session · dashed = progress · dotted = EMA</p>
        </>
      ) : (
        <p className="empty">No sessions in this range yet.</p>
      )}
    </div>
  );
}
