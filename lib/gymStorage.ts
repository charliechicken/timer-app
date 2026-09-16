import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import {
  DEFAULT_GOALS,
  isBodyPart,
  isExerciseId,
  type Exercise,
  type GymDay,
  type GymGoal,
  type GymLog,
  type GymSet,
} from "./gym";
import { formatFirebaseError } from "./storage";

const LOG_KEY = "gym-logs-v1";
const DAY_KEY = "gym-days-v1";
const GOAL_KEY = "gym-goals-v1";
const EXERCISE_KEY = "gym-exercises-v1";

function parseSet(raw: unknown): GymSet | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.weight !== "number" || typeof value.reps !== "number") {
    return null;
  }
  return { weight: value.weight, reps: value.reps };
}

function parseLog(raw: unknown): GymLog | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string") return null;
  if (typeof value.exerciseId !== "string" || !isExerciseId(value.exerciseId)) {
    return null;
  }
  if (value.split !== "full-body" && value.split !== "isolation") return null;
  if (typeof value.loggedAt !== "number" || typeof value.dateKey !== "string") {
    return null;
  }
  if (!Array.isArray(value.sets)) return null;
  const sets = value.sets.map(parseSet).filter((set): set is GymSet => set !== null);
  if (sets.length === 0) return null;
  return {
    id: value.id,
    exerciseId: value.exerciseId,
    split: value.split,
    loggedAt: value.loggedAt,
    dateKey: value.dateKey,
    sets,
  };
}

function parseDay(raw: unknown): GymDay | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string" || typeof value.dateKey !== "string") {
    return null;
  }
  if (value.split !== "full-body" && value.split !== "isolation") return null;
  if (typeof value.startedAt !== "number") return null;
  return {
    id: value.id,
    dateKey: value.dateKey,
    split: value.split,
    startedAt: value.startedAt,
  };
}

function parseGoal(raw: unknown): GymGoal | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string") return null;
  if (typeof value.exerciseId !== "string" || !isExerciseId(value.exerciseId)) {
    return null;
  }
  if (typeof value.weight !== "number" || typeof value.reps !== "number") {
    return null;
  }
  return {
    id: value.id,
    exerciseId: value.exerciseId,
    weight: value.weight,
    reps: value.reps,
  };
}

function parseExercise(raw: unknown): Exercise | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string" || !isExerciseId(value.id)) return null;
  if (typeof value.label !== "string" || !value.label.trim()) return null;
  if (value.split !== "full-body" && value.split !== "isolation") return null;
  if (typeof value.bodyPart !== "string" || !isBodyPart(value.bodyPart)) return null;
  if (typeof value.overloadReps !== "number" || value.overloadReps <= 0) return null;
  return {
    id: value.id,
    label: value.label.trim(),
    split: value.split,
    bodyPart: value.bodyPart,
    overloadReps: value.overloadReps,
    sortOrder: typeof value.sortOrder === "number" ? value.sortOrder : undefined,
    custom: value.custom === true,
    archived: value.archived === true,
  };
}

function loadLocal<T>(key: string, parse: (raw: unknown) => T | null): T[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parse).filter((item): item is T => item !== null);
  } catch {
    return [];
  }
}

function saveLocal<T>(key: string, value: T[]): void {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(`week-timer-${key}`));
}

function subscribeCollection<T>(
  ownerId: string,
  name: "gymLogs" | "gymDays" | "gymGoals" | "gymExercises",
  localKey: string,
  parse: (raw: unknown) => T | null,
  onChange: (items: T[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const db = getDb();
  if (!db) {
    onChange(loadLocal(localKey, parse));
    const handler = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== localKey) return;
      onChange(loadLocal(localKey, parse));
    };
    window.addEventListener("storage", handler);
    window.addEventListener(`week-timer-${localKey}`, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(`week-timer-${localKey}`, handler);
    };
  }

  return onSnapshot(
    collection(db, "users", ownerId, name),
    (snapshot) => {
      onChange(
        snapshot.docs
          .map((item) => parse({ id: item.id, ...item.data() }))
          .filter((item): item is T => item !== null),
      );
    },
    (error) => onError?.(formatFirebaseError(error.message)),
  );
}

async function upsertDoc<T extends { id: string }>(
  ownerId: string,
  name: "gymLogs" | "gymDays" | "gymGoals" | "gymExercises",
  localKey: string,
  parse: (raw: unknown) => T | null,
  item: T,
): Promise<void> {
  const db = getDb();
  if (!db) {
    const next = loadLocal(localKey, parse).filter((entry) => entry.id !== item.id);
    next.push(item);
    saveLocal(localKey, next);
    return;
  }
  await setDoc(doc(db, "users", ownerId, name, item.id), item);
}

async function removeDoc<T extends { id: string }>(
  ownerId: string,
  name: "gymLogs" | "gymDays" | "gymGoals" | "gymExercises",
  localKey: string,
  parse: (raw: unknown) => T | null,
  id: string,
): Promise<void> {
  const db = getDb();
  if (!db) {
    saveLocal(
      localKey,
      loadLocal(localKey, parse).filter((entry) => entry.id !== id),
    );
    return;
  }
  await deleteDoc(doc(db, "users", ownerId, name, id));
}

export function subscribeGymLogs(
  ownerId: string,
  onChange: (logs: GymLog[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return subscribeCollection(ownerId, "gymLogs", LOG_KEY, parseLog, onChange, onError);
}

export function subscribeGymDays(
  ownerId: string,
  onChange: (days: GymDay[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return subscribeCollection(ownerId, "gymDays", DAY_KEY, parseDay, onChange, onError);
}

export function subscribeGymGoals(
  ownerId: string,
  onChange: (goals: GymGoal[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return subscribeCollection(ownerId, "gymGoals", GOAL_KEY, parseGoal, onChange, onError);
}

export function subscribeGymExercises(
  ownerId: string,
  onChange: (exercises: Exercise[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return subscribeCollection(
    ownerId,
    "gymExercises",
    EXERCISE_KEY,
    parseExercise,
    onChange,
    onError,
  );
}

export async function saveGymLog(ownerId: string, log: GymLog): Promise<void> {
  await upsertDoc(ownerId, "gymLogs", LOG_KEY, parseLog, log);
}

export async function saveGymDay(ownerId: string, day: GymDay): Promise<void> {
  await upsertDoc(ownerId, "gymDays", DAY_KEY, parseDay, day);
}

export async function saveGymGoal(ownerId: string, goal: GymGoal): Promise<void> {
  await upsertDoc(ownerId, "gymGoals", GOAL_KEY, parseGoal, goal);
}

export async function saveGymExercise(ownerId: string, exercise: Exercise): Promise<void> {
  await upsertDoc(ownerId, "gymExercises", EXERCISE_KEY, parseExercise, exercise);
}

export async function deleteGymExercise(ownerId: string, id: string): Promise<void> {
  await removeDoc(ownerId, "gymExercises", EXERCISE_KEY, parseExercise, id);
}

export async function seedDefaultGoals(
  ownerId: string,
  existing: GymGoal[],
): Promise<void> {
  if (existing.length > 0) return;
  if (isFirebaseConfigured() && !getDb()) return;
  await Promise.all(DEFAULT_GOALS.map((goal) => saveGymGoal(ownerId, goal)));
}

export function logId(dateKeyValue: string, exerciseId: string): string {
  return `${dateKeyValue}-${exerciseId}`;
}
