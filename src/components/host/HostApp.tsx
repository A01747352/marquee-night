"use client";

import { useState } from "react";
import type { Action, HostView } from "@/lib/game";
import type { LinkStatus, RoomSettings } from "@/lib/realtime/room";
import {
  BonusWagerScreen,
  FinalQuestionScreen,
  FinalRevealScreen,
  FinalWagerScreen,
  LobbyScreen,
  PickScreen,
  QuestionScreen,
  RevealScreen,
  WinnerScreen,
} from "./HostScreens";
import { ScoreEditor } from "./ScoreEditor";

export function HostApp({
  roomCode,
  status,
  view,
  settings,
  act,
  pending,
  error,
  clearError,
  setMuted,
  onLeave,
}: {
  roomCode: string;
  status: LinkStatus;
  view: HostView | null;
  settings: RoomSettings;
  act: (a: Action) => Promise<string | null>;
  pending: boolean;
  error: string | null;
  clearError: () => void;
  setMuted: (muted: boolean) => void;
  onLeave: () => void;
}) {
  const [scoresOpen, setScoresOpen] = useState(false);
  const live = status === "live" && view !== null;

  let body: React.ReactNode;
  if (!view) {
    body = (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-panel-border border-t-gold" />
        <div className="text-[18px] font-semibold">Waiting for the TV…</div>
        <p className="max-w-[300px] text-[15px] text-text-muted">
          Make sure the game is open on the big screen and the room code is <b className="text-text">{roomCode}</b>.
        </p>
        <button type="button" onClick={onLeave} className="h-11 px-4 text-[15px] font-semibold text-text-dim underline">
          Use a different code
        </button>
      </div>
    );
  } else if (scoresOpen) {
    body = (
      <ScoreEditor
        teams={view.teams}
        lastAction={view.lastAction}
        disabled={pending}
        act={act}
        onDone={() => setScoresOpen(false)}
      />
    );
  } else {
    const props = { view, act, pending, openScores: () => setScoresOpen(true) };
    const p = view.phase;
    switch (p.kind) {
      case "lobby":
        body = <LobbyScreen {...props} />;
        break;
      case "board":
        body = <PickScreen {...props} />;
        break;
      case "bonusReveal":
        body = <BonusWagerScreen {...props} phase={p} key={`bonus-${p.tile.col}-${p.tile.row}`} />;
        break;
      case "question":
        body = <QuestionScreen {...props} phase={p} />;
        break;
      case "reveal":
        body = <RevealScreen {...props} phase={p} />;
        break;
      case "finalWager":
        body = <FinalWagerScreen {...props} phase={p} />;
        break;
      case "finalQuestion":
        body = <FinalQuestionScreen {...props} phase={p} />;
        break;
      case "finalReveal":
        body = <FinalRevealScreen {...props} phase={p} />;
        break;
      case "winner":
        body = <WinnerScreen {...props} />;
        break;
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-2 bg-bg/95 px-4 py-2 backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center gap-2 font-mono text-[12px] tracking-[0.08em]">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${live ? "bg-correct-soft" : "animate-pulse bg-gold"}`}
          />
          <span className="truncate">
            ROOM {roomCode} · {live ? "LIVE" : status === "offline" ? "OFFLINE" : "CONNECTING"}
          </span>
        </div>
        {view && view.phase.kind !== "lobby" && (
          <HeaderButton onClick={() => setScoresOpen((o) => !o)} active={scoresOpen}>
            Scores
          </HeaderButton>
        )}
        <HeaderButton disabled={!view?.lastAction || pending} onClick={() => act({ type: "undo" })}>
          Undo
        </HeaderButton>
        <HeaderButton onClick={() => setMuted(!settings.muted)} active={settings.muted}>
          {settings.muted ? "Muted" : "Mute"}
        </HeaderButton>
      </header>

      {status !== "live" && view && (
        <div className="mb-3 rounded-[12px] bg-gold/15 px-4 py-2 text-[14px] text-gold">Reconnecting… taps will go through once you&apos;re back.</div>
      )}

      <main className="flex-1">{body}</main>

      {error && (
        <button
          type="button"
          onClick={clearError}
          className="fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-20 mx-auto max-w-[448px] rounded-[14px] bg-wrong px-4 py-3 text-left text-[15px] font-semibold text-white shadow-2xl"
        >
          {error}
          <span className="ml-2 opacity-70">· tap to dismiss</span>
        </button>
      )}
    </div>
  );
}

function HeaderButton({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-11 min-w-[44px] rounded-[12px] px-2.5 text-[13px] font-semibold ring-2 disabled:opacity-35 ${active ? "bg-gold text-bg ring-gold" : "bg-panel ring-panel-border"}`}
    >
      {children}
    </button>
  );
}
