"use client";

import { useState } from "react";
import { formatScore, type Action, type Team } from "@/lib/game";
import { BigButton, Eyebrow } from "./ui";

const STEP = 100;

/** 1m · host override: fix any score at any time. */
export function ScoreEditor({
  teams,
  lastAction,
  disabled,
  act,
  onDone,
}: {
  teams: Team[];
  lastAction: string | null;
  disabled: boolean;
  act: (a: Action) => Promise<string | null>;
  onDone: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const commit = async (team: Team) => {
    setEditing(null);
    const n = Number(draft.replace("−", "-"));
    if (draft.trim() === "" || !Number.isInteger(n) || n === team.score) return;
    await act({ type: "setScore", teamId: team.id, score: n });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[28px] font-black uppercase tracking-[0.06em]">Edit scores</h2>
        <button type="button" onClick={onDone} className="h-11 rounded-[12px] bg-gold px-5 font-semibold text-bg">
          Done
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-[12px] bg-panel px-4 py-2 ring-2 ring-panel-border">
        <div className="min-w-0 flex-1">
          <Eyebrow>Last</Eyebrow>
          <div className="truncate text-[15px]">{lastAction ?? "Nothing yet"}</div>
        </div>
        <button
          type="button"
          disabled={!lastAction || disabled}
          onClick={() => act({ type: "undo" })}
          className="h-11 rounded-[12px] bg-[#2a3366] px-4 font-semibold disabled:opacity-40"
        >
          Undo
        </button>
      </div>

      {teams.map((t) => (
        <div key={t.id} className="rounded-[16px] bg-panel p-3 ring-2 ring-panel-border">
          <div className="mb-2 flex items-center gap-2 text-[15px] font-semibold">
            <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
            {t.name}
          </div>
          <div className="flex items-center gap-2">
            <Stepper label={`${t.name} minus ${STEP}`} disabled={disabled} onClick={() => act({ type: "adjustScore", teamId: t.id, delta: -STEP })}>
              −
            </Stepper>
            {editing === t.id ? (
              <input
                autoFocus
                inputMode="numeric"
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/[^\d−-]/g, ""))}
                onBlur={() => commit(t)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                className="h-[60px] min-w-0 flex-1 rounded-[12px] border-2 border-gold bg-bg text-center font-display text-[36px] font-black text-gold outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraft(String(t.score));
                  setEditing(t.id);
                }}
                className={`h-[60px] min-w-0 flex-1 rounded-[12px] bg-bg font-display text-[36px] font-black ${t.score < 0 ? "text-wrong-soft" : ""}`}
                aria-label={`Type a score for ${t.name}`}
              >
                {formatScore(t.score)}
              </button>
            )}
            <Stepper label={`${t.name} plus ${STEP}`} disabled={disabled} onClick={() => act({ type: "adjustScore", teamId: t.id, delta: STEP })}>
              +
            </Stepper>
          </div>
        </div>
      ))}

      <BigButton onClick={onDone}>Done</BigButton>
    </div>
  );
}

function Stepper({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        navigator.vibrate?.(8);
        onClick();
      }}
      className="h-[60px] w-[60px] shrink-0 rounded-[12px] bg-[#2a3366] font-display text-[34px] font-black disabled:opacity-40"
    >
      {children}
    </button>
  );
}
