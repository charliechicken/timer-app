"use client";

import { sendAppEmail } from "@/lib/alerts";
import { BODY_PARTS, bodyPartLabel } from "@/lib/gym";
import { downloadGymPdf } from "@/lib/gymPdf";
import { gymWeekEmail, type GymWeekStats, type LiftSeries } from "@/lib/gymStats";
import { formatCompact } from "@/lib/time";

export function GymWeekPanel({
  stats,
  series,
  email,
  notice,
  onNotice,
}: {
  stats: GymWeekStats;
  series: LiftSeries[];
  email?: string | null;
  notice?: string | null;
  onNotice?: (message: string) => void;
}) {
  async function emailReport() {
    if (!email) {
      onNotice?.("Sign in to email the weekly gym report.");
      return;
    }
    const payload = gymWeekEmail(stats);
    const result = await sendAppEmail({ email, ...payload });
    onNotice?.(
      result.pendingConfirm
        ? `Check ${email} for a FormSubmit confirm link, then email again.`
        : result.ok
          ? `Sent this week’s gym report to ${email}.`
          : result.error ?? "Could not send the gym report.",
    );
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">{stats.rangeLabel}</p>
          <h3>Weekly gym report</h3>
        </div>
        <div className="split-pick">
          <button type="button" className="ghost" onClick={() => downloadGymPdf(stats, series)}>
            Download PDF
          </button>
          <button type="button" className="stop" onClick={() => void emailReport()}>
            Email report
          </button>
        </div>
      </div>
      {notice ? <p className="email-notice">{notice}</p> : null}
      <div className="report-stats day-stats">
        <article>
          <p>Sets</p>
          <strong>{stats.totalSets}</strong>
        </article>
        <article>
          <p>Workouts</p>
          <strong>{stats.workoutDays}</strong>
        </article>
        <article>
          <p>Gym time</p>
          <strong>{formatCompact(stats.totalGymMs)}</strong>
        </article>
        <article>
          <p>Avg / day</p>
          <strong>{stats.workoutDays ? formatCompact(stats.averageGymMs) : "—"}</strong>
        </article>
      </div>
      <p className="report-insight">{stats.insight}</p>
      <div className="body-parts">
        {BODY_PARTS.map((part) => (
          <article key={part}>
            <p>{bodyPartLabel(part)}</p>
            <strong>{stats.bodyPartSets[part]}</strong>
          </article>
        ))}
      </div>
      {stats.topLifts.length ? (
        <ol className="report-ranks">
          {stats.topLifts.map((lift) => (
            <li key={lift.label}>
              <span className="rank-label">{lift.label}</span>
              <span className="rank-time">
                {lift.setLabel} · e1RM {lift.e1rm.toFixed(1)}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
