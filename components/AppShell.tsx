"use client";

import { useAuth } from "@/hooks/useAuth";
import { useWeekTimer } from "@/hooks/useWeekTimer";
import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";

function AlertBridge({
  uid,
  email,
}: {
  uid: string | null;
  email: string | null;
}) {
  useWeekTimer(uid, email, true);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const header = (
    <AppHeader
      email={auth.user?.email}
      signedIn={Boolean(auth.user)}
      usingFirebase={auth.usingFirebase}
      busy={auth.busy}
      error={auth.error}
      onSignIn={() => void auth.signIn()}
      onSignOut={() => void auth.signOut()}
    />
  );

  if (auth.usingFirebase && !auth.authReady) {
    return (
      <main className="shell">
        {header}
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (auth.usingFirebase && !auth.user) {
    return (
      <main className="shell">
        {header}
        <section className="panel signin">
          <p className="eyebrow">Week timer</p>
          <h1>Sign in to sync</h1>
          <p className="muted">
            Use Sign in with Google in the top right. Firestore is in production
            mode, so your log is locked to your Google account.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <AlertBridge
        uid={auth.user?.uid ?? null}
        email={auth.user?.email ?? null}
      />
      {header}
      {children}
    </main>
  );
}
