"use client";

import Link from "next/link";
import { AppShell } from "./AppShell";

const QUICK_STARTS = [
  { href: "/start/youtube", label: "Start YouTube", hint: "YT" },
  { href: "/start/chess", label: "Start Chess", hint: "Chess" },
  { href: "/start/instagram", label: "Start Instagram", hint: "IG" },
  { href: "/gym", label: "Open Gym", hint: "Gym" },
] as const;

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

        <div className="panel quick-start-panel">
          <div className="panel-title">
            <h3>Quick starts</h3>
            <p>One tap here — or add these pages to your phone Home Screen as buttons.</p>
          </div>
          <div className="quick-start-grid">
            {QUICK_STARTS.map((item) => (
              <Link key={item.href} href={item.href} className="quick-start">
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </Link>
            ))}
          </div>
          <ol className="install-steps">
            <li>
              <strong>iPhone:</strong> open a quick start (e.g. Start YouTube) → Share → Add to Home
              Screen. Repeat for each button you want.
            </li>
            <li>
              <strong>Android:</strong> open the site in Chrome → Add to Home screen / Install app,
              then long-press the app icon for Start YouTube, Chess, Gym.
            </li>
            <li>
              True live widgets need a native app later; these Home Screen shortcuts are the web
              equivalent.
            </li>
          </ol>
        </div>
      </section>
    </AppShell>
  );
}
