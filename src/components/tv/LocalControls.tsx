"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Action, PublicView } from "@/lib/game";

/**
 * Laptop controls, shown over the TV when the mouse moves. They only see the
 * PublicView, so they can't show an answer on the big screen. Final-round
 * wagers typed here ARE visible to the room — the phone remote is the private
 * way to enter them.
 */
export function LocalControls({
  view,
  dispatch,
  error,
}: {
  view: PublicView;
  dispatch: (a: Action) => string | null;
  error: string | null;
}) {
  const [visible, setVisible] = useState(true);
  const [pinned, setPinned] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const show = () => {
      setVisible(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 3500);
    };
    show();
    window.addEventListener("mousemove", show);
    return () => {
      window.removeEventListener("mousemove", show);
      clearTimeout(hideTimer.current);
    };
  }, []);

  const togglePin = useCallback(() => setPinned((p) => !p), []);
  useKeyboardShortcuts(view, dispatch, togglePin);

  const shown = visible || pinned || !!error;

  return (
    <div
      data-local-controls
      className={`fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 transition-all duration-300 ${shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"}`}
    >
      <div className="flex max-w-[1200px] flex-col gap-2 rounded-2xl border border-panel-border bg-[#070c26]/95 px-4 py-3 text-sm shadow-2xl backdrop-blur">
        {error && <div className="rounded-lg bg-wrong/20 px-3 py-1.5 text-wrong-soft">{error}</div>}
        <div className="flex flex-wrap items-center gap-2">
          <PhaseControls view={view} dispatch={dispatch} />
          <span className="mx-1 h-6 w-px bg-panel-border" />
          <Btn onClick={() => dispatch({ type: "undo" })} title="Z">
            Undo
          </Btn>
          <Btn onClick={toggleFullscreen} title="F">
            Fullscreen
          </Btn>
          <Link href="/" className="rounded-lg px-3 py-2 text-text-dim hover:bg-panel hover:text-text">
            Exit
          </Link>
        </div>
      </div>
    </div>
  );
}

function PhaseControls({ view, dispatch }: { view: PublicView; dispatch: (a: Action) => string | null }) {
  const p = view.phase;
  const teamName = (id: string) => view.teams.find((t) => t.id === id)?.name ?? "?";

  switch (p.kind) {
    case "lobby":
      return (
        <Btn primary onClick={() => dispatch({ type: "startGame" })}>
          Start game
        </Btn>
      );
    case "board":
      return (
        <>
          <span className="px-2 text-text-muted">Click a tile to open it.</span>
          <Btn onClick={() => dispatch({ type: "goToFinal" })}>Skip to final round</Btn>
        </>
      );
    case "bonusReveal":
      return (
        <WagerInput
          label={`${teamName(p.teamId)} wager (0–${p.maxWager})`}
          max={p.maxWager}
          onLock={(amount) => dispatch({ type: "lockBonusWager", amount })}
        />
      );
    case "question":
    case "finalQuestion": {
      const timer = p.timer;
      const timerBtns = (
        <>
          <Btn onClick={() => dispatch({ type: timer.running ? "timerPause" : "timerStart" })} title="P">
            {timer.running ? "Pause timer" : "Start timer"}
          </Btn>
          <Btn onClick={() => dispatch({ type: "timerSkip" })} title="S">
            Skip timer
          </Btn>
        </>
      );
      if (p.kind === "finalQuestion") {
        return (
          <>
            {timerBtns}
            <Btn primary onClick={() => dispatch({ type: "startFinalReveal" })}>
              Reveal answers
            </Btn>
          </>
        );
      }
      return (
        <>
          <span className="px-2 text-text-muted">{teamName(p.answeringId)}:</span>
          <Btn tone="correct" onClick={() => dispatch({ type: "correct" })} title="C">
            Correct
          </Btn>
          <Btn tone="wrong" onClick={() => dispatch({ type: "wrong" })} title="W">
            Wrong
          </Btn>
          <Btn onClick={() => dispatch({ type: "revealAnswer" })} title="R">
            {p.stage === "steal" ? "Nobody got it · reveal" : "Reveal answer"}
          </Btn>
          {timerBtns}
        </>
      );
    }
    case "reveal":
      return (
        <Btn primary onClick={() => dispatch({ type: "continue" })} title="Enter">
          Continue
        </Btn>
      );
    case "finalWager": {
      const ids = Object.keys(p.status);
      const allLocked = ids.every((id) => p.status[id] === "locked");
      return (
        <>
          {ids.map((id) => {
            const score = view.teams.find((t) => t.id === id)?.score ?? 0;
            return (
              <WagerInput
                key={id}
                label={`${teamName(id)} (0–${score})`}
                max={score}
                locked={p.status[id] === "locked"}
                onLock={(amount) => dispatch({ type: "lockFinalWager", teamId: id, amount })}
              />
            );
          })}
          <Btn primary disabled={!allLocked} onClick={() => dispatch({ type: "showFinalQuestion" })}>
            Show question
          </Btn>
        </>
      );
    }
    case "finalReveal": {
      const next = p.order.find((id) => !(id in p.revealed));
      if (!next) {
        return (
          <Btn primary onClick={() => dispatch({ type: "showWinner" })}>
            Show winner
          </Btn>
        );
      }
      return <FinalJudge teamName={teamName(next)} onJudge={(correct, answer) => dispatch({ type: "judgeFinal", teamId: next, correct, answer })} />;
    }
    case "winner":
      return (
        <Link href="/" className="rounded-lg bg-gold px-4 py-2 font-semibold text-bg">
          New game
        </Link>
      );
  }
}

function WagerInput({
  label,
  max,
  locked,
  onLock,
}: {
  label: string;
  max: number;
  locked?: boolean;
  onLock: (amount: number) => string | null;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onLock(Number(value || 0));
      }}
    >
      <label className="text-text-muted">
        {label}
        {locked && <span className="ml-1 text-correct-soft">✓</span>}
      </label>
      <input
        type="number"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 rounded-lg border border-panel-border bg-panel px-2 py-1.5 text-text"
      />
      <Btn type="submit">{locked ? "Update" : "Lock"}</Btn>
    </form>
  );
}

function FinalJudge({ teamName, onJudge }: { teamName: string; onJudge: (correct: boolean, answer: string) => void }) {
  const [answer, setAnswer] = useState("");
  const judge = (correct: boolean) => {
    onJudge(correct, answer);
    setAnswer("");
  };
  return (
    <>
      <span className="px-2 text-text-muted">{teamName} answered</span>
      <input
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="their answer (optional)"
        className="w-56 rounded-lg border border-panel-border bg-panel px-2 py-1.5 text-text"
      />
      <Btn tone="correct" onClick={() => judge(true)}>
        Correct
      </Btn>
      <Btn tone="wrong" onClick={() => judge(false)}>
        Wrong
      </Btn>
    </>
  );
}

function Btn({
  children,
  onClick,
  primary,
  tone,
  disabled,
  title,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  tone?: "correct" | "wrong";
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  const style = primary
    ? "bg-gold text-bg font-semibold"
    : tone === "correct"
      ? "bg-correct text-white font-semibold"
      : tone === "wrong"
        ? "bg-wrong text-white font-semibold"
        : "bg-panel text-text border border-panel-border";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title ? `Shortcut: ${title}` : undefined}
      className={`rounded-lg px-3 py-2 transition hover:brightness-110 disabled:opacity-40 ${style}`}
    >
      {children}
    </button>
  );
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}

function useKeyboardShortcuts(view: PublicView, dispatch: (a: Action) => string | null, togglePin: () => void) {
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      const kind = viewRef.current.phase.kind;
      const inQuestion = kind === "question";
      const timed = kind === "question" || kind === "finalQuestion";
      const key = e.key.toLowerCase();

      if (key === "f") toggleFullscreen();
      else if (key === "h") togglePin();
      else if (key === "z") dispatch({ type: "undo" });
      else if (inQuestion && key === "c") dispatch({ type: "correct" });
      else if (inQuestion && key === "w") dispatch({ type: "wrong" });
      else if (inQuestion && key === "r") dispatch({ type: "revealAnswer" });
      else if (timed && key === "s") dispatch({ type: "timerSkip" });
      else if (timed && key === "p") {
        const p = viewRef.current.phase;
        if ("timer" in p) dispatch({ type: p.timer.running ? "timerPause" : "timerStart" });
      } else if (kind === "reveal" && (key === "enter" || key === " ")) {
        e.preventDefault();
        dispatch({ type: "continue" });
      } else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, togglePin]);
}
