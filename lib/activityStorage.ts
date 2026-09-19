import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import {
  isActivityId,
  type Activity,
  type ActivityGroup,
} from "./activities";
import { getDb } from "./firebase";
import { formatFirebaseError } from "./storage";

const LOCAL_KEY = "week-timer-activities-v1";

const GROUPS: ActivityGroup[] = ["study", "club", "life", "training"];

function parseActivity(raw: unknown): Activity | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string" || !isActivityId(value.id)) return null;
  if (typeof value.label !== "string" || !value.label.trim()) return null;
  if (typeof value.shortLabel !== "string" || !value.shortLabel.trim()) return null;
  if (typeof value.group !== "string" || !GROUPS.includes(value.group as ActivityGroup)) {
    return null;
  }
  if (typeof value.color !== "string" || !value.color.trim()) return null;
  return {
    id: value.id,
    label: value.label.trim(),
    shortLabel: value.shortLabel.trim(),
    group: value.group as ActivityGroup,
    color: value.color.trim(),
    custom: value.custom === true,
    archived: value.archived === true,
  };
}

function loadLocal(): Activity[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseActivity).filter((item): item is Activity => item !== null);
  } catch {
    return [];
  }
}

function saveLocal(activities: Activity[]): void {
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(activities));
  window.dispatchEvent(new Event("week-timer-activities"));
}

export function subscribeActivities(
  ownerId: string,
  onChange: (activities: Activity[]) => void,
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
    window.addEventListener("week-timer-activities", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("week-timer-activities", handler);
    };
  }

  return onSnapshot(
    collection(db, "users", ownerId, "activities"),
    (snapshot) => {
      onChange(
        snapshot.docs
          .map((item) => parseActivity({ id: item.id, ...item.data() }))
          .filter((item): item is Activity => item !== null),
      );
    },
    (error) => onError?.(formatFirebaseError(error.message)),
  );
}

export async function saveActivity(ownerId: string, activity: Activity): Promise<void> {
  const db = getDb();
  if (!db) {
    const next = loadLocal().filter((item) => item.id !== activity.id);
    next.push(activity);
    saveLocal(next);
    return;
  }
  await setDoc(doc(db, "users", ownerId, "activities", activity.id), activity);
}

export async function deleteActivity(ownerId: string, id: string): Promise<void> {
  const db = getDb();
  if (!db) {
    saveLocal(loadLocal().filter((item) => item.id !== id));
    return;
  }
  await deleteDoc(doc(db, "users", ownerId, "activities", id));
}
