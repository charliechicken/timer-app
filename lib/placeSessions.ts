import type { ActivityId, Session } from "./types";
import { startOfDay } from "./time";

const MIN_GAP_MS = 5 * 60_000;
const CHUNK_MS = 30 * 60_000;

type Occupied = { start: number; end: number };

function occupiedOnDay(sessions: Session[], dayStart: number, dayEnd: number): Occupied[] {
  return sessions
    .map((session) => ({
      start: Math.max(session.startAt, dayStart),
      end: Math.min(session.endAt ?? session.startAt, dayEnd),
    }))
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start - b.start);
}

function mergeOccupied(blocks: Occupied[]): Occupied[] {
  const merged: Occupied[] = [];
  for (const block of blocks) {
    const last = merged[merged.length - 1];
    if (last && block.start <= last.end) {
      last.end = Math.max(last.end, block.end);
    } else {
      merged.push({ ...block });
    }
  }
  return merged;
}

function gapsIn(windowStart: number, windowEnd: number, occupied: Occupied[]): Occupied[] {
  const gaps: Occupied[] = [];
  let cursor = windowStart;
  for (const block of occupied) {
    if (block.start > cursor) gaps.push({ start: cursor, end: block.start });
    cursor = Math.max(cursor, block.end);
  }
  if (cursor < windowEnd) gaps.push({ start: cursor, end: windowEnd });
  return gaps.filter((gap) => gap.end - gap.start >= MIN_GAP_MS);
}

export function placeManualSessions(options: {
  activityId: ActivityId;
  durationMs: number;
  day: Date;
  existing: Session[];
  startAt?: number;
  spread?: boolean;
}): Session[] {
  const { activityId, durationMs, day, existing, startAt, spread } = options;
  if (durationMs <= 0) return [];
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const windowStart = dayStart + 8 * 60 * 60 * 1000;
  const windowEnd = dayStart + 22 * 60 * 60 * 1000;

  if (!spread) {
    const start = startAt ?? windowStart;
    return [
      {
        id: crypto.randomUUID(),
        activityId,
        startAt: start,
        endAt: start + durationMs,
        targetEndAt: null,
        manual: true,
      },
    ];
  }

  const occupied = mergeOccupied(
    occupiedOnDay(existing, dayStart, dayEnd).filter(
      (block) => block.end > windowStart && block.start < windowEnd,
    ),
  );
  const fillFrom = startAt ?? windowStart;
  const gaps = gapsIn(Math.max(windowStart, fillFrom), windowEnd, occupied);
  const placed: Session[] = [];
  let remaining = durationMs;

  for (const gap of gaps) {
    if (remaining <= 0) break;
    let cursor = gap.start;
    while (remaining > 0 && gap.end - cursor >= MIN_GAP_MS) {
      const room = gap.end - cursor;
      const take =
        remaining > CHUNK_MS * 1.4 ? Math.min(CHUNK_MS, room, remaining) : Math.min(room, remaining);
      placed.push({
        id: crypto.randomUUID(),
        activityId,
        startAt: cursor,
        endAt: cursor + take,
        targetEndAt: null,
        manual: true,
      });
      remaining -= take;
      cursor += take;
    }
  }

  if (remaining > 0) {
    const fallbackStart = placed.at(-1)?.endAt ?? startAt ?? windowStart;
    placed.push({
      id: crypto.randomUUID(),
      activityId,
      startAt: fallbackStart,
      endAt: fallbackStart + remaining,
      targetEndAt: null,
      manual: true,
    });
  }

  return placed;
}
