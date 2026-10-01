"use client";

import { useEffect, useState } from "react";
import type { TimerView } from "@/lib/game";

/**
 * Live remaining time for a TimerView. The view is a snapshot, so we count down
 * locally from the moment it arrived (this also sidesteps clock skew between
 * the TV and the phone).
 */
export function useCountdown(timer: TimerView | null): number {
  const [remaining, setRemaining] = useState(timer?.remainingMs ?? 0);

  useEffect(() => {
    if (!timer) return;
    const receivedAt = performance.now();
    const tick = () => {
      const left = timer.running
        ? Math.max(0, timer.remainingMs - (performance.now() - receivedAt))
        : timer.remainingMs;
      setRemaining(left);
      return left;
    };
    tick();
    if (!timer.running) return;
    const id = setInterval(() => {
      if (tick() <= 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [timer]);

  return remaining;
}
