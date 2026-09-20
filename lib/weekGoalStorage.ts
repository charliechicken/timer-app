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
import {
  isWeekGoalScope,
  type GoalDirection,
  type WeekGoal,
} from "./weekGoals";

const LOCAL_KEY = "week-timer-week-goals-v1";

function parseGoal(raw: unknown): WeekGoal | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string") return null;
  if (typeof value.scope !== "string" || !isWeekGoalScope(value.scope)) return null;
  if (typeof value.targetHours !== "number" || value.targetHours < 0) return null;
  if (value.direction !== "aim-up" && value.direction !== "cap") return null;
  return {
    id: value.id,
    scope: value.scope,
    targetHours: value.targetHours,
    direction: value.direction as GoalDirection,
  };
}

function loadLocal(): WeekGoal[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseGoal).filter((item): item is WeekGoal => item !== null);
  } catch {
    return [];
  }
}

function saveLocal(goals: WeekGoal[]): void {
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(goals));
  window.dispatchEvent(new Event("week-timer-week-goals"));
}

export function subscribeWeekGoals(
  ownerId: string,
  onChange: (goals: WeekGoal[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const db = getDb();
  if (!db) {
    onChange(loadLocal());
    const handler = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== LOCAL_KEY) return;
      onChange(loadLocal());
    };
    window.addEventListener("storage", handler);
    window.addEventListener("week-timer-week-goals", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("week-timer-week-goals", handler);
    };
  }

  return onSnapshot(
    collection(db, "users", ownerId, "weekGoals"),
    (snapshot) => {
      onChange(
        snapshot.docs
          .map((item) => parseGoal({ id: item.id, ...item.data() }))
          .filter((item): item is WeekGoal => item !== null),
      );
    },
    (error) => onError?.(formatFirebaseError(error.message)),
  );
}

export async function saveWeekGoal(ownerId: string, goal: WeekGoal): Promise<void> {
  const db = getDb();
  if (!db) {
    const next = loadLocal().filter((item) => item.id !== goal.id);
    next.push(goal);
    saveLocal(next);
    return;
  }
  await setDoc(doc(db, "users", ownerId, "weekGoals", goal.id), goal);
}

export async function deleteWeekGoal(ownerId: string, id: string): Promise<void> {
  const db = getDb();
  if (!db) {
    saveLocal(loadLocal().filter((item) => item.id !== id));
    return;
  }
  await deleteDoc(doc(db, "users", ownerId, "weekGoals", id));
}
