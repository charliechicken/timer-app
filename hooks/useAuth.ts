"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isFirebaseConfigured,
  signInWithGoogle,
  signOutUser,
  watchAuth,
} from "@/lib/firebase";
import type { User } from "firebase/auth";

export function useAuth() {
  const usingFirebase = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!usingFirebase);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!usingFirebase) {
      setAuthReady(true);
      return;
    }
    return watchAuth((next) => {
      setUser(next);
      setAuthReady(true);
    });
  }, [usingFirebase]);

  const signIn = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Sign-in failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await signOutUser();
    } finally {
      setBusy(false);
    }
  }, []);

  return { user, authReady, usingFirebase, error, busy, signIn, signOut };
}
