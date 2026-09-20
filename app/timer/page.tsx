import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";

export default function TimerPage() {
  return (
    <Suspense fallback={<p className="muted">Loading timer…</p>}>
      <Dashboard />
    </Suspense>
  );
}
