"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { PublicPhase, PublicView } from "@/lib/game";
import { audioReady, playSound, subscribeAudio, unlockAudio, type SoundName } from "@/lib/sound";

/** Which sting a phase change deserves, if any. */
export function soundFor(prev: PublicPhase | null, next: PublicPhase): { name: SoundName; delayMs?: number } | null {
  if (!prev) return null; // first render / refresh: stay quiet
  if (next.kind === "bonusReveal" && prev.kind !== "bonusReveal") return { name: "bonus", delayMs: 350 };
  if (next.kind === "question" && prev.kind === "board") return { name: "tileOpen" };
  if (next.kind === "question" && prev.kind === "question" && next.stage === "steal" && prev.stage === "picker") {
    return { name: "wrong" };
  }
  if (next.kind === "reveal" && prev.kind === "question") {
    // Only judge a result that was just added ("Nobody got it · reveal" adds none).
    if (next.results.length <= prev.results.length) return null;
    return { name: next.results.at(-1)!.delta > 0 ? "correct" : "wrong" };
  }
  if (next.kind === "finalReveal" && prev.kind === "finalReveal") {
    const before = Object.keys(prev.revealed).length;
    const ids = Object.keys(next.revealed);
    if (ids.length > before) {
      const newest = ids.find((id) => !(id in prev.revealed));
      if (newest) return { name: next.revealed[newest].correct ? "correct" : "wrong", delayMs: 250 };
    }
  }
  if (next.kind === "winner" && prev.kind !== "winner") return { name: "winner", delayMs: 300 };
  return null;
}

/**
 * Plays stings on the TV as the game moves, plus a buzzer when the timer runs
 * out. Muted from the host remote. Returns whether audio still needs a click
 * to unlock (browsers block sound until the page gets one).
 */
export function useGameSounds(view: PublicView | null, muted: boolean): { needsUnlock: boolean } {
  const prev = useRef<PublicPhase | null>(null);
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const ready = useSyncExternalStore(subscribeAudio, audioReady, () => true);

  // Any click or key on the TV page unlocks audio.
  useEffect(() => {
    if (ready) return;
    const unlock = () => unlockAudio();
    unlockAudio(); // works right away if the page already had a click (e.g. "Open lobby")
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [ready]);

  // Phase-change stings.
  useEffect(() => {
    if (!view) return;
    const sting = soundFor(prev.current, view.phase);
    prev.current = view.phase;
    if (!sting || mutedRef.current) return;
    const t = setTimeout(() => playSound(sting.name), sting.delayMs ?? 0);
    return () => clearTimeout(t);
  }, [view]);

  // Timer end: schedule the buzzer for when the running timer hits zero.
  const p = view?.phase;
  const timer = p && "timer" in p ? p.timer : null;
  useEffect(() => {
    if (!timer?.running || timer.remainingMs <= 0) return;
    const t = setTimeout(() => {
      if (!mutedRef.current) playSound("timerEnd");
    }, timer.remainingMs);
    return () => clearTimeout(t);
  }, [timer]);

  return { needsUnlock: !ready && !muted };
}
