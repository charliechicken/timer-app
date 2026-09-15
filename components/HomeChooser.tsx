"use client";

import Link from "next/link";
import { AppShell } from "./AppShell";

export function HomeChooser() {
  return (
    <AppShell>
      <section className="chooser">
        <div>
          <p className="eyebrow">This week</p>
          <h1>What are you doing?</h1>
          <p className="muted">Gym for the lift log. Timer for study, clubs, and everything else.</p>
        </div>
        <div className="chooser-grid">
          <Link href="/gym" className="chooser-card">
            <p className="eyebrow">Training</p>
            <h2>Gym</h2>
            <p>6-day split, sets, and progress toward your goals.</p>
          </Link>
          <Link href="/timer" className="chooser-card">
            <p className="eyebrow">Tracking</p>
            <h2>Timer</h2>
            <p>Study, clubs, chess, YouTube, and the rest of the week.</p>
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
