"use client";

import { activitiesInGroup } from "@/lib/activities";
import { requestAlertPermission } from "@/lib/alerts";
import { formatWeekRange } from "@/lib/time";
import { ActivityBlock } from "./ActivityBlock";
import { AppShell } from "./AppShell";
import { DayView } from "./DayView";
import { HeroTimer } from "./HeroTimer";
import { SessionList } from "./SessionList";
import { WeekCalendar } from "./WeekCalendar";
import { WeekTodo } from "./WeekTodo";
import { WeekChart } from "./WeekChart";
import { WeekReport } from "./WeekReport";
import { useAuth } from "@/hooks/useAuth";
import { useWeekTasks } from "@/hooks/useWeekTasks";
import { useWeekTimer } from "@/hooks/useWeekTimer";

export function Dashboard() {
  const auth = useAuth();
  const timer = useWeekTimer(auth.user?.uid ?? null);
  const todos = useWeekTasks(auth.user?.uid ?? null, timer.weekStart);
  const study = activitiesInGroup("study");
  const clubs = activitiesInGroup("club");
  const life = activitiesInGroup("life");
  const showReportFirst = timer.isCompleteWeek || timer.isWeekEnding;
  const showLastWeekPrompt =
    timer.weekOffset === 0 &&
    new Date().getDay() === 1 &&
    timer.previousWeekTotal > 0;

  function startTimed(activityId: (typeof study)[number]["id"], durationMs: number) {
    void requestAlertPermission();
    void timer.start(activityId, durationMs);
  }

  const report = (
    <WeekReport
      weekStart={timer.weekStart}
      weekTotal={timer.weekTotal}
      studyTotal={timer.studyTotal}
      clubTotal={timer.clubTotal}
      lifeTotal={timer.lifeTotal}
      gymTotal={timer.gymTotal}
      previousWeekTotal={timer.previousWeekTotal}
      sessionCount={timer.sessionCount}
      busiestDay={timer.busiestDay}
      totalsByActivity={timer.totalsByActivity}
      complete={timer.isCompleteWeek}
      wrappingUp={timer.isWeekEnding}
    />
  );

  return (
    <AppShell>
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

      {timer.syncError ? <p className="sync-error">{timer.syncError}</p> : null}

      {showLastWeekPrompt ? (
        <button type="button" className="recap-banner" onClick={() => timer.goToWeek(-1)}>
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

      <WeekTodo
        weekStart={timer.weekStart}
        tasks={todos.weekTasks}
        error={todos.error}
        onAdd={todos.addTask}
        onDue={(id, dueKey) => todos.updateTask(id, { dueKey })}
        onTitle={(id, title) => todos.updateTask(id, { title })}
        onCommitOrder={todos.commitOrder}
        onToggle={(id, done) => todos.updateTask(id, { done })}
        onRemove={todos.removeTask}
      />

      <section className="panel">
        <div className="panel-title">
          <h3>Study for these classes</h3>
          <p>Start a countdown, or add minutes you already spent</p>
        </div>
        <div className="grid study">
          {study.map((activity) => (
            <ActivityBlock
              key={activity.id}
              activity={activity}
              totalMs={timer.totalsByActivity[activity.id]}
              running={timer.activeSession?.activityId === activity.id}
              selectedDay={timer.selectedDay ?? new Date()}
              onToggle={() => void timer.start(activity.id)}
              onStartTimed={(durationMs) => void startTimed(activity.id, durationMs)}
              onAddTime={(durationMs, options) =>
                void timer.addTime(activity.id, durationMs, options)
              }
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
            <ActivityBlock
              key={activity.id}
              activity={activity}
              totalMs={timer.totalsByActivity[activity.id]}
              running={timer.activeSession?.activityId === activity.id}
              selectedDay={timer.selectedDay ?? new Date()}
              onToggle={() => void timer.start(activity.id)}
              onStartTimed={(durationMs) => void startTimed(activity.id, durationMs)}
              onAddTime={(durationMs, options) =>
                void timer.addTime(activity.id, durationMs, options)
              }
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
            <ActivityBlock
              key={activity.id}
              activity={activity}
              totalMs={timer.totalsByActivity[activity.id]}
              running={timer.activeSession?.activityId === activity.id}
              selectedDay={timer.selectedDay ?? new Date()}
              onToggle={() => void timer.start(activity.id)}
              onStartTimed={(durationMs) => void startTimed(activity.id, durationMs)}
              onAddTime={(durationMs, options) =>
                void timer.addTime(activity.id, durationMs, options)
              }
            />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>{timer.weekOffset === 0 ? "This week" : "That week"}</h3>
          <p>Tap a day for the calendar and daily insights</p>
        </div>
        <WeekChart
          days={timer.totalsByDay}
          selectedDayIndex={timer.selectedDayIndex}
          onSelectDay={timer.setSelectedDayIndex}
        />
        {timer.selectedDay ? (
          <>
            {timer.undoCount > 0 ? (
              <div className="undo-bar">
                <span>Session deleted.</span>
                <button type="button" className="ghost" onClick={() => void timer.undoRemove()}>
                  Undo
                </button>
              </div>
            ) : null}
            <WeekCalendar
              weekStart={timer.weekStart}
              sessions={timer.sessions}
              now={timer.now}
              selectedDay={timer.selectedDay ?? new Date()}
              onSelectDay={(date) => {
                const index = timer.days.findIndex(
                  (day) => day.toDateString() === date.toDateString(),
                );
                if (index >= 0) timer.setSelectedDayIndex(index);
              }}
            />
            <DayView
              date={timer.selectedDay}
              sessions={timer.selectedDaySessions}
              now={timer.now}
              previousDayTotal={
                timer.selectedDayIndex > 0
                  ? timer.totalsByDay[timer.selectedDayIndex - 1]?.total ?? 0
                  : 0
              }
              onDelete={(sessionId) => void timer.remove(sessionId)}
            />
            <SessionList
              date={timer.selectedDay}
              sessions={timer.selectedDaySessions}
              now={timer.now}
              onDelete={(sessionId) => void timer.remove(sessionId)}
            />
          </>
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
        <span>
          Timed sessions email {auth.user?.email ?? "you"}, show a notification, and play a sound.
        </span>
      </footer>
    </AppShell>
  );
}
