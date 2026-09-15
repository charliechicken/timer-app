"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWeekTimer } from "@/hooks/useWeekTimer";
import { emailTimerComplete } from "@/lib/alerts";
import { getGmailToken } from "@/lib/gmail";
import { AppHeader } from "./AppHeader";

function AlertBridge({
  uid,
  email,
}: {
  uid: string | null;
  email: string | null;
}) {
  const timer = useWeekTimer(uid, email, true);
  if (!timer.emailNotice) return null;
  return <p className="email-notice">{timer.emailNotice}</p>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  async function testEmail() {
    const address = auth.user?.email;
    if (!address) return;
    setEmailNotice("Sending a test email…");
    try {
      let result = await emailTimerComplete({
        email: address,
        activityId: "chess",
        minutes: 1,
        test: true,
      });
      if (!result.ok && !getGmailToken()) {
        setEmailNotice("Allow Gmail sending in the Google popup, then we will retry.");
        const granted = await auth.signIn(true);
        if (granted) {
          result = await emailTimerComplete({
            email: address,
            activityId: "chess",
            minutes: 1,
            test: true,
          });
        }
      }
      if (result.pendingConfirm) {
        setEmailNotice(
          `Check ${address} (and spam) for an email from FormSubmit. Click the confirm link once, then press Test email again.`,
        );
        return;
      }
      setEmailNotice(
        result.ok
          ? `Sent a test email to ${address}. Check inbox and spam.`
          : result.error ?? "Could not send email.",
      );
    } catch (error) {
      setEmailNotice(error instanceof Error ? error.message : "Could not send email.");
    }
  }

  const header = (
    <AppHeader
      email={auth.user?.email}
      signedIn={Boolean(auth.user)}
      usingFirebase={auth.usingFirebase}
      busy={auth.busy}
      error={auth.error}
      onSignIn={() => void auth.signIn()}
      onSignOut={() => void auth.signOut()}
      onTestEmail={auth.user?.email ? () => void testEmail() : undefined}
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
      {emailNotice ? <p className="email-notice">{emailNotice}</p> : null}
      {children}
    </main>
  );
}
