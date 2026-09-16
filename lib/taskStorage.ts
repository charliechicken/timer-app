import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { formatFirebaseError } from "./storage";
import type { WeekTask } from "./tasks";

const TASK_KEY = "week-tasks-v1";

function parseTask(raw: unknown): WeekTask | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string") return null;
  if (typeof value.title !== "string" || !value.title.trim()) return null;
  if (typeof value.dueKey !== "string" || typeof value.weekKey !== "string") return null;
  if (typeof value.priority !== "number" || typeof value.createdAt !== "number") return null;
  return {
    id: value.id,
    title: value.title.trim(),
    dueKey: value.dueKey,
    weekKey: value.weekKey,
    priority: value.priority,
    done: value.done === true,
    createdAt: value.createdAt,
  };
}

function loadLocal(): WeekTask[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TASK_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseTask).filter((item): item is WeekTask => item !== null);
  } catch {
    return [];
  }
}

function saveLocal(tasks: WeekTask[]): void {
  window.localStorage.setItem(TASK_KEY, JSON.stringify(tasks));
  window.dispatchEvent(new Event(`week-timer-${TASK_KEY}`));
}

export function subscribeWeekTasks(
  ownerId: string,
  onChange: (tasks: WeekTask[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const db = getDb();
  if (!db) {
    onChange(loadLocal());
    const handler = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== TASK_KEY) return;
      onChange(loadLocal());
    };
    window.addEventListener("storage", handler);
    window.addEventListener(`week-timer-${TASK_KEY}`, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(`week-timer-${TASK_KEY}`, handler);
    };
  }

  return onSnapshot(
    collection(db, "users", ownerId, "weekTasks"),
    (snapshot) => {
      onChange(
        snapshot.docs
          .map((item) => parseTask({ id: item.id, ...item.data() }))
          .filter((item): item is WeekTask => item !== null),
      );
    },
    (error) => onError?.(formatFirebaseError(error.message)),
  );
}

export async function saveWeekTask(ownerId: string, task: WeekTask): Promise<void> {
  const db = getDb();
  if (!db) {
    const next = loadLocal().filter((item) => item.id !== task.id);
    next.push(task);
    saveLocal(next);
    return;
  }
  await setDoc(doc(db, "users", ownerId, "weekTasks", task.id), task);
}

export async function deleteWeekTask(ownerId: string, id: string): Promise<void> {
  const db = getDb();
  if (!db) {
    saveLocal(loadLocal().filter((item) => item.id !== id));
    return;
  }
  await deleteDoc(doc(db, "users", ownerId, "weekTasks", id));
}
