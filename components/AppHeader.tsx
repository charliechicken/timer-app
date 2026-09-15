"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppHeaderProps = {
  email?: string | null;
  signedIn?: boolean;
  usingFirebase?: boolean;
  busy?: boolean;
  error?: string | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onTestEmail?: () => void;
};

export function AppHeader({
  email,
  signedIn = false,
  usingFirebase = false,
  busy = false,
  error,
  onSignIn,
  onSignOut,
  onTestEmail,
}: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="app-header">
      <nav className="app-nav">
        <Link href="/" className={pathname === "/" ? "current" : ""}>
          Home
        </Link>
        <Link href="/timer" className={pathname === "/timer" ? "current" : ""}>
          Timer
        </Link>
        <Link href="/gym" className={pathname.startsWith("/gym") ? "current" : ""}>
          Gym
        </Link>
      </nav>
      <div className="account">
        {signedIn ? (
          <>
            <span className="account-email">{email ?? "Signed in"}</span>
            {onTestEmail ? (
              <button type="button" className="ghost" onClick={onTestEmail}>
                Test email
              </button>
            ) : null}
            {onSignOut ? (
              <button
                type="button"
                className="ghost"
                onClick={onSignOut}
                disabled={busy}
              >
                {busy ? "Signing out…" : "Sign out"}
              </button>
            ) : null}
          </>
        ) : usingFirebase ? (
          <button
            type="button"
            className="stop"
            onClick={onSignIn}
            disabled={busy || !onSignIn}
          >
            {busy ? "Opening Google…" : "Sign in with Google"}
          </button>
        ) : (
          <span>This browser only</span>
        )}
        {error ? <span className="stale">{error}</span> : null}
      </div>
    </header>
  );
}
