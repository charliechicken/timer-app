import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { isActivityId } from "./activities";
import { getDb, isFirebaseConfigured } from "./firebase";
import type { Session } from "./types";

const LOCAL_KEY = "week-timer-sessions-v1";

export function formatFirebaseError(message: string): string {
  if (message.toLowerCase().includes("permission")) {
    return "Firestore blocked the save. In Firebase, open Firestore → Rules, paste firestore.rules from this repo, and click Publish.";
  }
  return message;
}

function parseSession(raw: unknown): Session | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string") return null;
  if (typeof value.activityId !== "string" || !isActivityId(value.activityId)) {
    return null;
  }
  if (typeof value.startAt !== "number") return null;
  if (value.endAt !== null && typeof value.endAt !== "number") return null;
  return {
    id: value.id,
    activityId: value.activityId,
    startAt: value.startAt,
    endAt: value.endAt,
  };
}

export function loadLocalSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseSession).filter((session): session is Session => session !== null);
  } catch {
    return [];
  }
}

export function saveLocalSessions(sessions: Session[]): void {
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(sessions));
}

export function subscribeSessions(
  ownerId: string,
  onChange: (sessions: Session[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const db = getDb();
  if (!db) {
    onChange(loadLocalSessions());
    const handler = (event: StorageEvent) => {
      if (event.key === LOCAL_KEY) onChange(loadLocalSessions());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  return onSnapshot(
    collection(db, "users", ownerId, "sessions"),
    (snapshot) => {
      const sessions = snapshot.docs
        .map((item) => parseSession({ id: item.id, ...item.data() }))
        .filter((session): session is Session => session !== null)
        .sort((a, b) => b.startAt - a.startAt);
      onChange(sessions);
    },
    (error) => {
      onError?.(formatFirebaseError(error.message));
    },
  );
}

export async function commitSessions(
  ownerId: string,
  nextSessions: Session[],
  upserts: Session[] = [],
  deletes: string[] = [],
): Promise<void> {
  const db = getDb();
  if (!db) {
    saveLocalSessions(nextSessions);
    return;
  }

  await Promise.all([
    ...upserts.map((session) =>
      setDoc(doc(db, "users", ownerId, "sessions", session.id), session),
    ),
    ...deletes.map((sessionId) =>
      deleteDoc(doc(db, "users", ownerId, "sessions", sessionId)),
    ),
  ]).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Could not save to Firestore";
    throw new Error(formatFirebaseError(message));
  });
}

export async function upsertSession(ownerId: string, session: Session): Promise<void> {
  const next = loadLocalSessions().filter((item) => item.id !== session.id);
  next.push(session);
  await commitSessions(ownerId, next, [session]);
}

export async function migrateLocalSessionsIfNeeded(
  ownerId: string,
  remoteSessions: Session[],
): Promise<void> {
  if (!isFirebaseConfigured() || remoteSessions.length > 0) return;
  const local = loadLocalSessions();
  if (local.length === 0) return;
  await Promise.all(local.map((session) => upsertSession(ownerId, session)));
}
