"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { activitiesInGroup, isActivityId } from "@/lib/activities";
import { requestAlertPermission } from "@/lib/alerts";
import { formatWeekRange } from "@/lib/time";
import type { ActivityId } from "@/lib/types";
import { ActivityBlock } from "./ActivityBlock";
import { AppShell } from "./AppShell";
import { DayView } from "./DayView";
import { HeroTimer } from "./HeroTimer";
import { SessionList } from "./SessionList";
import { WeekCalendar } from "./WeekCalendar";
import { WeekGoalsPanel } from "./WeekGoalsPanel";
import { WeekTodo } from "./WeekTodo";
import { WeekChart } from "./WeekChart";
import { WeekReport } from "./WeekReport";
import { useAuth } from "@/hooks/useAuth";
import { useWeekGoals } from "@/hooks/useWeekGoals";
import { useWeekTasks } from "@/hooks/useWeekTasks";
import { useWeekTimer } from "@/hooks/useWeekTimer";

export function Dashboard() {
  const auth = useAuth();
  const searchParams = useSearchParams();
  const timer = useWeekTimer(auth.user?.uid ?? null);
  const todos = useWeekTasks(auth.user?.uid ?? null, timer.weekStart);
  const goals = useWeekGoals(
    auth.user?.uid ?? null,
    timer.totalsByActivity,
    timer.activities,
    timer.weekTotal,
  );
  const study = activitiesInGroup("study", timer.activities);
  const clubs = activitiesInGroup("club", timer.activities);
  const life = activitiesInGroup("life", timer.activities);
  const [newTimer, setNewTimer] = useState("");
  const autoStarted = useRef<string | null>(null);
  const showReportFirst = timer.isCompleteWeek || timer.isWeekEnding;
  const showLastWeekPrompt =
    timer.weekOffset === 0 &&
    new Date().getDay() === 1 &&
    timer.previousWeekTotal > 0;

  useEffect(() => {
    if (!timer.ready || timer.weekOffset !== 0) return;
    const startId = searchParams.get("start");
    if (!startId || !isActivityId(startId)) return;
    if (autoStarted.current === startId) return;
    if (timer.activeSession?.activityId === startId) {
      autoStarted.current = startId;
      return;
    }
    autoStarted.current = startId;
    void requestAlertPermission();
    void timer.start(startId);
  }, [
    searchParams,
    timer.ready,
    timer.weekOffset,
    timer.activeSession?.activityId,
    timer.start,
  ]);

  function startTimed(activityId: ActivityId, durationMs: number) {
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
      activities={timer.activities}
      goalStatuses={goals.statuses}
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
          activities={timer.activities}
          onStop={() => void timer.stop()}
        />
      ) : null}

      <WeekGoalsPanel
        activities={timer.activities}
        statuses={goals.statuses}
        error={goals.error}
        onSave={goals.upsertGoal}
        onRemove={goals.removeGoal}
      />

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
              totalMs={timer.totalsByActivity[activity.id] ?? 0}
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
              totalMs={timer.totalsByActivity[activity.id] ?? 0}
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
          <p>Chess, YouTube, Instagram, eating — plus timers you create, like Running</p>
        </div>
        <form
          className="goal-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!newTimer.trim()) return;
            void timer.createActivity({ label: newTimer }).then(() => setNewTimer(""));
          }}
        >
          <label>
            <span>New timer</span>
            <input
              value={newTimer}
              placeholder="Running"
              onChange={(event) => setNewTimer(event.target.value)}
            />
          </label>
          <button type="submit" className="stop">
            Add timer
          </button>
        </form>
        <div className="grid life">
          {life.map((activity) => (
            <ActivityBlock
              key={activity.id}
              activity={activity}
              totalMs={timer.totalsByActivity[activity.id] ?? 0}
              running={timer.activeSession?.activityId === activity.id}
              selectedDay={timer.selectedDay ?? new Date()}
              onToggle={() => void timer.start(activity.id)}
              onStartTimed={(durationMs) => void startTimed(activity.id, durationMs)}
              onAddTime={(durationMs, options) =>
                void timer.addTime(activity.id, durationMs, options)
              }
              onRemove={
                activity.custom
                  ? () => void timer.archiveActivity(activity.id)
                  : undefined
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
          activities={timer.activities}
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
              activities={timer.activities}
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
              activities={timer.activities}
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
              activities={timer.activities}
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
