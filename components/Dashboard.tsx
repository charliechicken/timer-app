"use client";

import { activitiesInGroup } from "@/lib/activities";
import { formatWeekRange } from "@/lib/time";
import { ActivityCard } from "./ActivityCard";
import { HeroTimer } from "./HeroTimer";
import { SessionList } from "./SessionList";
import { WeekChart } from "./WeekChart";
import { WeekReport } from "./WeekReport";
import { useAuth } from "@/hooks/useAuth";
import { useWeekTimer } from "@/hooks/useWeekTimer";

export function Dashboard() {
  const auth = useAuth();
  const timer = useWeekTimer(auth.user?.uid ?? null);
  const study = activitiesInGroup("study");
  const clubs = activitiesInGroup("club");
  const life = activitiesInGroup("life");
  const showReportFirst = timer.isCompleteWeek || timer.isWeekEnding;
  const showLastWeekPrompt =
    timer.weekOffset === 0 &&
    new Date().getDay() === 1 &&
    timer.previousWeekTotal > 0;

  if (auth.usingFirebase && auth.authReady && !auth.user) {
    return (
      <main className="shell">
        <section className="panel signin">
          <p className="eyebrow">Week timer</p>
          <h1>Sign in to sync</h1>
          <p className="muted">
            Firestore is in production mode, so your log is locked to your
            Google account.
          </p>
          <button
            type="button"
            className="stop"
            onClick={() => void auth.signIn()}
            disabled={auth.busy}
          >
            {auth.busy ? "Opening Google…" : "Sign in with Google"}
          </button>
          {auth.error ? <p className="stale">{auth.error}</p> : null}
        </section>
      </main>
    );
  }

  const report = (
    <WeekReport
      weekStart={timer.weekStart}
      weekTotal={timer.weekTotal}
      studyTotal={timer.studyTotal}
      clubTotal={timer.clubTotal}
      lifeTotal={timer.lifeTotal}
      previousWeekTotal={timer.previousWeekTotal}
      sessionCount={timer.sessionCount}
      busiestDay={timer.busiestDay}
      totalsByActivity={timer.totalsByActivity}
      complete={timer.isCompleteWeek}
      wrappingUp={timer.isWeekEnding}
    />
  );

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="brand">Week timer</p>
          <h2>{formatWeekRange(timer.weekStart)}</h2>
        </div>
        <div className="week-nav">
          <button type="button" onClick={() => timer.goToWeek(timer.weekOffset - 1)}>
            Prev
          </button>
          <button
            type="button"
            className={timer.weekOffset === 0 ? "current" : ""}
            onClick={() => timer.goToWeek(0)}
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => timer.goToWeek(timer.weekOffset + 1)}
            disabled={timer.weekOffset === 0}
          >
            Next
          </button>
        </div>
      </header>

      {showLastWeekPrompt ? (
        <button
          type="button"
          className="recap-banner"
          onClick={() => timer.goToWeek(-1)}
        >
          Last week’s report is ready. Open it.
        </button>
      ) : null}

      {showReportFirst ? report : null}

      {timer.weekOffset === 0 ? (
        <HeroTimer
          activeSession={timer.activeSession}
          now={timer.now}
          weekTotal={timer.weekTotal}
          classTotal={timer.studyTotal}
          stale={timer.stale}
          onStop={() => void timer.stop()}
        />
      ) : null}

      <section className="panel">
        <div className="panel-title">
          <h3>Study for these classes</h3>
          <p>PHIL, ECON, MATH, S&DS, CHNS</p>
        </div>
        <div className="grid study">
          {study.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              totalMs={timer.totalsByActivity[activity.id]}
              running={timer.activeSession?.activityId === activity.id}
              onToggle={() => void timer.start(activity.id)}
            />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>Clubs</h3>
          <p>MMA and wrestling</p>
        </div>
        <div className="grid clubs">
          {clubs.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              totalMs={timer.totalsByActivity[activity.id]}
              running={timer.activeSession?.activityId === activity.id}
              onToggle={() => void timer.start(activity.id)}
            />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>Everything else</h3>
          <p>Chess, YouTube, Instagram, eating</p>
        </div>
        <div className="grid life">
          {life.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              totalMs={timer.totalsByActivity[activity.id]}
              running={timer.activeSession?.activityId === activity.id}
              onToggle={() => void timer.start(activity.id)}
            />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>{timer.weekOffset === 0 ? "This week" : "That week"}</h3>
          <p>Tap a day to see sessions</p>
        </div>
        <WeekChart
          days={timer.totalsByDay}
          selectedDayIndex={timer.selectedDayIndex}
          onSelectDay={timer.setSelectedDayIndex}
        />
        {timer.selectedDay ? (
          <SessionList
            date={timer.selectedDay}
            sessions={timer.selectedDaySessions}
            now={timer.now}
            onDelete={(sessionId) => void timer.remove(sessionId)}
          />
        ) : null}
      </section>

      {showReportFirst ? null : report}

      <footer className="status">
        <span className={`pill ${timer.usingFirebase ? "live" : "local"}`}>
          {timer.ready
            ? timer.usingFirebase
              ? "Firestore"
              : "This browser only"
            : "Loading"}
        </span>
        {auth.user ? <span>{auth.user.email}</span> : <span>This browser only</span>}
        {auth.user ? (
          <button type="button" className="ghost" onClick={() => void auth.signOut()}>
            Sign out
          </button>
        ) : (
          <span>
            Create a production Firestore database, then add the Firebase keys on
            Vercel and sign in with Google.
          </span>
        )}
      </footer>
    </main>
  );
}
