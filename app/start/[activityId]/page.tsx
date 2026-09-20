"use client";

import { use, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resolveActivity, isActivityId } from "@/lib/activities";
import { requestAlertPermission } from "@/lib/alerts";
import { useAuth } from "@/hooks/useAuth";
import { useWeekTimer } from "@/hooks/useWeekTimer";
import { AppShell } from "@/components/AppShell";
import { HeroTimer } from "@/components/HeroTimer";

export default function StartActivityPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = use(params);
  const auth = useAuth();
  const timer = useWeekTimer(auth.user?.uid ?? null);
  const router = useRouter();
  const started = useRef(false);
  const activity = isActivityId(activityId)
    ? resolveActivity(activityId, timer.activities)
    : null;

  useEffect(() => {
    if (!timer.ready || !activity || started.current) return;
    if (activityId === "gym") {
      started.current = true;
      router.replace("/gym");
      return;
    }
    started.current = true;
    void requestAlertPermission();
    void timer.start(activity.id);
  }, [activity, activityId, router, timer]);

  if (!isActivityId(activityId) || !activity) {
    return (
      <AppShell>
        <section className="panel">
          <h2>Unknown timer</h2>
          <p className="muted">That quick-start link is not recognized.</p>
          <Link href="/timer" className="stop">
            Open timer
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <HeroTimer
        activeSession={
          timer.activeSession?.activityId === activity.id ? timer.activeSession : null
        }
        now={timer.now}
        weekTotal={timer.totalsByActivity[activity.id] ?? 0}
        classTotal={timer.weekTotal}
        stale={timer.stale && timer.activeSession?.activityId === activity.id}
        idleTitle={`Starting ${activity.label}…`}
        summary={`${activity.label} quick start`}
        activities={timer.activities}
        onStop={() => void timer.stop()}
      />
      <p className="muted start-hint">
        Bookmark or Add to Home Screen this page for a one-tap {activity.label} button.
      </p>
      <div className="split-pick">
        <Link href="/timer" className="ghost">
          Full timer
        </Link>
        <Link href="/" className="ghost">
          Home
        </Link>
      </div>
    </AppShell>
  );
}
