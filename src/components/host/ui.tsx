"use client";

import type { ReactNode } from "react";
import { formatClock, formatScore, type Team, type TimerView } from "@/lib/game";
import { useCountdown } from "@/lib/useCountdown";

type Tone = "gold" | "correct" | "wrong" | "neutral" | "hot" | "ghost";

const TONES: Record<Tone, string> = {
  gold: "bg-gold text-bg shadow-[0_0_30px_rgba(255,197,61,0.3)]",
  correct: "bg-correct text-white",
  wrong: "bg-wrong text-white",
  neutral: "bg-[#2a3366] text-text",
  hot: "bg-hot text-white",
  ghost: "bg-panel text-text ring-2 ring-panel-border",
};

/** Big, one-handed tap target. `size="xl"` is the 120px primary action. */
export function BigButton({
  children,
  sub,
  tone = "ghost",
  size = "md",
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  size?: "md" | "lg" | "xl";
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  const height = size === "xl" ? "min-h-[120px] text-[34px]" : size === "lg" ? "min-h-[72px] text-[22px]" : "min-h-[52px] text-[17px]";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        navigator.vibrate?.(12);
        onClick();
      }}
      className={`flex flex-col items-center justify-center rounded-[16px] px-4 font-display font-black uppercase tracking-[0.06em] transition active:scale-[0.98] active:brightness-90 disabled:opacity-40 ${height} ${TONES[tone]} ${className}`}
    >
      <span className="leading-none">{children}</span>
      {sub && <span className="mt-1.5 font-body text-[13px] font-semibold tracking-normal normal-case opacity-85">{sub}</span>}
    </button>
  );
}

export function Eyebrow({
  children,
  className = "",
  tone = "text-text-dim",
}: {
  children: ReactNode;
  className?: string;
  /** A Tailwind text-color class. */
  tone?: string;
}) {
  return <div className={`font-mono text-[11px] uppercase tracking-[0.2em] ${tone} ${className}`}>{children}</div>;
}

/** The answer, for the host's eyes only. */
export function AnswerCard({
  answer,
  lines,
  label = "Answer · host only",
}: {
  answer: string;
  /** Shown instead of `answer` as a numbered list (Order It). */
  lines?: string[] | null;
  label?: string;
}) {
  return (
    <div className="rounded-[16px] bg-gold px-5 py-4 text-bg shadow-[0_0_30px_rgba(255,197,61,0.25)]">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-70">{label}</div>
      {lines ? (
        <ol className="mt-1 flex flex-col gap-1">
          {lines.map((l, i) => (
            <li key={i} className="font-display text-[24px] font-black uppercase leading-[1.05] break-words">
              <span className="opacity-60">{i + 1}.</span> {l}
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-1 font-display text-[34px] font-black uppercase leading-[1] break-words">{answer}</div>
      )}
    </div>
  );
}

export function TimerRow({
  timer,
  onToggle,
  onSkip,
  disabled,
}: {
  timer: TimerView;
  onToggle: () => void;
  onSkip: () => void;
  disabled?: boolean;
}) {
  const remaining = useCountdown(timer);
  const pct = timer.durationMs ? (remaining / timer.durationMs) * 100 : 0;
  const urgent = remaining <= 5000;
  return (
    <div className="flex items-center gap-3">
      <div className={`w-[64px] font-display text-[32px] font-black tabular-nums ${urgent ? "text-wrong-soft" : "text-text"}`}>
        {formatClock(remaining)}
      </div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-timer-track">
        <div
          className={`h-full rounded-full ${urgent ? "bg-wrong-soft" : "bg-gold"}`}
          style={{ width: `${pct}%`, transition: "width 100ms linear" }}
        />
      </div>
      <button
        type="button"
        disabled={disabled || remaining <= 0}
        onClick={onToggle}
        className="h-11 min-w-[72px] rounded-[12px] bg-panel px-3 text-[14px] font-semibold ring-2 ring-panel-border disabled:opacity-40"
      >
        {timer.running ? "Pause" : "Start"}
      </button>
      <button
        type="button"
        disabled={disabled || remaining <= 0}
        onClick={onSkip}
        className="h-11 min-w-[60px] rounded-[12px] bg-panel px-3 text-[14px] font-semibold ring-2 ring-panel-border disabled:opacity-40"
      >
        Skip
      </button>
    </div>
  );
}

export function TeamScores({
  teams,
  activeId,
  onTap,
}: {
  teams: Team[];
  activeId?: string | null;
  onTap?: () => void;
}) {
  return (
    <button type="button" onClick={onTap} className="grid w-full grid-cols-2 gap-2 text-left" aria-label="Edit scores">
      {teams.map((t) => (
        <div
          key={t.id}
          className={`flex min-h-[52px] items-center gap-2.5 rounded-[12px] bg-panel px-3 py-2 ring-2 ${t.id === activeId ? "ring-hot" : "ring-panel-border"}`}
        >
          <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: t.color }} />
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{t.name}</span>
          <span className={`font-display text-[24px] font-black ${t.score < 0 ? "text-wrong-soft" : ""}`}>
            {formatScore(t.score)}
          </span>
        </div>
      ))}
    </button>
  );
}

export function TeamName({ team }: { team?: Team }) {
  if (!team) return null;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: team.color }} />
      {team.name}
    </span>
  );
}
