"use client";

import { activitiesInGroup } from "@/lib/activities";
import { formatWeekRange } from "@/lib/time";
import { ActivityCard } from "./ActivityCard";
import { HeroTimer } from "./HeroTimer";
import { SessionList } from "./SessionList";
import { WeekChart } from "./WeekChart";
import { useWeekTimer } from "@/hooks/useWeekTimer";

export function Dashboard() {
  const timer = useWeekTimer();
  const classes = activitiesInGroup("class");
  const life = activitiesInGroup("life");

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

      <HeroTimer
        activeSession={timer.activeSession}
        now={timer.now}
        weekTotal={timer.weekTotal}
        classTotal={timer.classTotal}
        stale={timer.stale}
        onStop={() => void timer.stop()}
      />

      <section className="panel">
        <div className="panel-title">
          <h3>Classes</h3>
          <p>PHIL, ECON, MATH, S&DS, CHNS</p>
        </div>
        <div className="grid classes">
          {classes.map((activity) => (
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
          <h3>This week</h3>
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

      <footer className="status">
        <span className={`pill ${timer.usingFirebase ? "live" : "local"}`}>
          {timer.ready
            ? timer.usingFirebase
              ? "Firebase"
              : "This browser only"
            : "Loading"}
        </span>
        <span>Owner {timer.ownerId.slice(0, 8)}</span>
        {!timer.usingFirebase ? (
          <span>
            Add Firebase env vars on Vercel to sync across phone and laptop.
          </span>
        ) : null}
      </footer>
    </main>
  );
}
